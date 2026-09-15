import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessInstitution, getSessionUser, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { getInstitutionIssuerKey } from "@/lib/crypto/issuerKey";
import { buildUnsignedCredential, signCredential } from "@/lib/vc/issue";
import type { CredentialRecord } from "@/lib/vc/types";
import { sendGmailNotification, emailTemplates } from "@/lib/gmail/send";
import { appUrl } from "@/lib/app-url";

const issueSchema = z.object({
  holderUid: z.string().min(1),
  credentialType: z.enum(["BachelorDegree", "MasterDegree", "CourseCertificate", "Diploma"]),
  title: z.string().min(3).max(160),
  validityYears: z.number().int().min(0).max(50).optional(),
});

function nextCredentialId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 90000 + 10000);
  return `VC-${year}-${suffix}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const credentials = user.role === "ISSUER" || user.role === "ADMIN" ? (await store.listAllCredentials()).filter((credential) => canAccessInstitution(user, credential.institutionId)) : await store.listCredentialsForHolder(user.uid);
  return NextResponse.json({ credentials });
}

export async function POST(request: Request) {
  try {
    const issuer = await requireRole("ISSUER", "ADMIN");
    const parsed = issueSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_ISSUE_REQUEST", details: parsed.error.flatten() }, { status: 400 });

    const holder = await store.getUser(parsed.data.holderUid);
    if (!holder || holder.role !== "STUDENT") return NextResponse.json({ error: "HOLDER_NOT_FOUND" }, { status: 404 });
    if (holder.status !== "ACTIVE") return NextResponse.json({ error: "STUDENT_NOT_VERIFIED" }, { status: 403 });
    if (!canAccessInstitution(issuer, holder.institutionId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const issuerKey = getInstitutionIssuerKey();
    const credentialId = nextCredentialId();
    const issuedAt = new Date().toISOString();
    const validUntil = parsed.data.validityYears ? new Date(Date.now() + parsed.data.validityYears * 365 * 24 * 60 * 60 * 1000).toISOString() : undefined;

    const unsigned = buildUnsignedCredential({
      credentialId,
      issuerDid: issuerKey.did,
      holderDid: holder.did,
      holderName: holder.name,
      credentialType: parsed.data.credentialType,
      title: parsed.data.title,
      institution: process.env.DEFAULT_INSTITUTION_NAME ?? "Chandigarh University",
      issuanceDate: issuedAt,
      validUntil,
      extraSubjectFields: {
        institutionLogoUrl: process.env.DEFAULT_INSTITUTION_LOGO_URL ?? "/university_logo.png",
      },
    });
    const signedVc = signCredential(unsigned, issuerKey.privateKey, `${issuerKey.did}#key-1`);

    const record: CredentialRecord = {
      credentialId,
      holderUid: holder.uid,
      holderDid: holder.did,
      issuerDid: issuerKey.did,
      institutionId: holder.institutionId,
      credentialType: parsed.data.credentialType,
      status: "ACTIVE",
      version: 1,
      vc: signedVc,
      issuedAt,
      validUntil,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    };
    await store.createCredential(record);
    await store.logAudit({ action: "CREDENTIAL_ISSUED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: record.institutionId, targetId: credentialId, occurredAt: issuedAt });

    const verifyUrl = appUrl(`/verify?id=${credentialId}`);
    const email = emailTemplates.credentialIssued(holder.name, parsed.data.title, credentialId, verifyUrl);
    const emailResult = await sendGmailNotification(holder.email, email.subject, email.text);

    return NextResponse.json({ credential: record, email: emailResult, issuedBy: issuer.uid });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
