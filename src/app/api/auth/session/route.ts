import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminAuth, adminDb, firebaseAdminConfigured, firebaseConfigurationPresent } from "@/lib/firebase/admin";
import { store } from "@/lib/store";
import { generateEd25519KeyPair } from "@/lib/crypto/ed25519";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth/session";
import { DEMO_SESSION_COOKIE, signDemoSession } from "@/lib/auth/demo";
import { sendGmailNotification } from "@/lib/gmail/send";

const productionSchema = z.object({ idToken: z.string().min(10), name: z.string().min(1).max(120).optional(), role: z.enum(["STUDENT", "ISSUER"]).optional() });
const demoSchema = z.object({ demoUid: z.enum(["demo-student-aarav", "demo-issuer-registrar"]) });

const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const secureCookie = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const jar = await cookies();

  if (firebaseAdminConfigured) {
    const parsed = productionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID_LOGIN_REQUEST" }, { status: 400 });
    let decoded;
    try {
      decoded = await adminAuth().verifyIdToken(parsed.data.idToken);
    } catch {
      return NextResponse.json({ error: "INVALID_ID_TOKEN" }, { status: 401 });
    }

    // Role is never taken from the client for an EXISTING user: only a brand-new sign-up
    // is allowed to declare a starting role (self-service students only; issuer accounts
    // must be provisioned by an administrator directly in Firestore).
    let profile = await store.getUser(decoded.uid);
    if (!profile) {
      const institutionId = process.env.DEFAULT_INSTITUTION_ID ?? "chandigarh-university";
      const institution = await adminDb().collection("institutions").doc(institutionId).get();
      if (!institution.exists || institution.data()?.status !== "ACTIVE") {
        return NextResponse.json({ error: "INSTITUTION_NOT_CONFIGURED" }, { status: 503 });
      }
      const keys = generateEd25519KeyPair();
      const now = new Date().toISOString();
      profile = {
        uid: decoded.uid,
        name: parsed.data.name ?? decoded.email ?? "Student",
        email: decoded.email ?? "",
        role: "STUDENT",
        did: keys.did,
        publicKeyMultibase: keys.publicKeyMultibase,
        institutionId,
        status: "PENDING_VERIFICATION",
        createdAt: now,
        updatedAt: now,
      };
      await store.upsertUser(profile);
      await store.logAudit({ action: "STUDENT_REGISTERED", actorUid: profile.uid, actorRole: profile.role, institutionId: profile.institutionId, targetId: profile.uid, occurredAt: now });
      if (profile.email) void sendGmailNotification(profile.email, "VIGYAN.ID — Registration received", `Hi ${profile.name},\n\nYour registration was received and is pending university verification.\n\n— VIGYAN.ID`).catch(() => undefined);
    }

    const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, { expiresIn: SESSION_MAX_AGE_MS });
    jar.set(FIREBASE_SESSION_COOKIE, sessionCookie, { httpOnly: true, secure: secureCookie, sameSite: "lax", maxAge: SESSION_MAX_AGE_MS / 1000, path: "/" });
    return NextResponse.json({ uid: profile.uid, role: profile.role });
  }

  if (firebaseConfigurationPresent) return NextResponse.json({ error: "FIREBASE_SERVER_NOT_CONFIGURED" }, { status: 503 });

  // Demo mode sign-in: no Firebase project connected. Only the two seeded demo accounts
  // can be selected, and this path is completely disabled once Firebase Admin is configured.
  const parsed = demoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_LOGIN_REQUEST" }, { status: 400 });
  const profile = await store.getUser(parsed.data.demoUid);
  if (!profile) return NextResponse.json({ error: "DEMO_USER_NOT_FOUND" }, { status: 404 });
  const token = await signDemoSession({ uid: profile.uid, role: profile.role });
  jar.set(DEMO_SESSION_COOKIE, token, { httpOnly: true, secure: secureCookie, sameSite: "lax", maxAge: SESSION_MAX_AGE_MS / 1000, path: "/" });
  return NextResponse.json({ uid: profile.uid, role: profile.role, mode: "demo" });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(FIREBASE_SESSION_COOKIE);
  jar.delete(DEMO_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { getSessionUser } = await import("@/lib/auth/session");
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { uid: user.uid, role: user.role, profile: user.profile, mode: user.mode } });
}
