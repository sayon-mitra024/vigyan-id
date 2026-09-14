import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb, firebaseAdminConfigured } from "@/lib/firebase/admin";
import { getInstitutionIssuerKey } from "@/lib/crypto/issuerKey";
import { requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";

const provisionSchema = z.object({
  institutionId: z.string().regex(/^[a-z0-9-]{3,80}$/),
  institution: z.object({
    name: z.string().min(2).max(160),
    shortName: z.string().min(2).max(30),
    officialEmailDomain: z.string().min(3).max(160),
    registrationNumber: z.string().min(1).max(120),
    address: z.string().min(2).max(300),
  }),
  issuer: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(6).max(128),
  }),
});

export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN");
    if (!firebaseAdminConfigured || admin.mode !== "firestore") {
      return NextResponse.json({ error: "FIREBASE_ADMIN_REQUIRED" }, { status: 503 });
    }

    const parsed = provisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_PROVISION_REQUEST", details: parsed.error.flatten() }, { status: 400 });

    const { institutionId, institution, issuer } = parsed.data;
    const expectedDomain = institution.officialEmailDomain.toLowerCase().replace(/^@/, "");
    if (issuer.email.toLowerCase().split("@")[1] !== expectedDomain) {
      return NextResponse.json({ error: "ISSUER_EMAIL_DOMAIN_MISMATCH" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await adminDb().collection("institutions").doc(institutionId).set({ institutionId, ...institution, status: "ACTIVE", createdAt: now, updatedAt: now }, { merge: true });

    let authUser;
    try {
      authUser = await adminAuth().createUser({ email: issuer.email, password: issuer.password, displayName: issuer.name, disabled: false });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error && error.message.includes("email-already-exists") ? "ISSUER_EMAIL_ALREADY_EXISTS" : "ISSUER_AUTH_CREATION_FAILED" }, { status: 409 });
    }

    try {
      const issuerKey = getInstitutionIssuerKey();
      const profile = {
        uid: authUser.uid,
        name: issuer.name,
        email: issuer.email,
        role: "ISSUER" as const,
        did: issuerKey.did,
        publicKeyMultibase: issuerKey.did.slice("did:key:".length),
        institutionId,
        status: "ACTIVE" as const,
        createdAt: now,
        updatedAt: now,
      };
      await store.upsertUser(profile);
      return NextResponse.json({ uid: authUser.uid, institutionId, role: profile.role });
    } catch {
      await adminAuth().deleteUser(authUser.uid).catch(() => undefined);
      return NextResponse.json({ error: "ISSUER_PROFILE_CREATION_FAILED" }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
