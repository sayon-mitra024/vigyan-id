import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessInstitution, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { getInstitutionIssuerKey } from "@/lib/crypto/issuerKey";
import { buildUnsignedCredential, signCredential } from "@/lib/vc/issue";
import type { CredentialRecord } from "@/lib/vc/types";
import { sendGmailNotification, emailTemplates } from "@/lib/gmail/send";
import { appUrl } from "@/lib/app-url";

const reviewSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), rejectionReason: z.string().max(300).optional() });

function nextCredentialId(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 90000 + 10000);
  return `VC-${year}-${suffix}`;
}

/**
 * Approving a correction NEVER mutates the original credential document. It marks the
 * original SUPERSEDED and creates a brand-new, freshly-signed credential document that
 * links back via `previousVersion`/`supersededBy`. Both versions remain independently
 * verifiable forever.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const issuer = await requireRole("ISSUER", "ADMIN");
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REVIEW_REQUEST" }, { status: 400 });

    const correction = await store.getCorrection(id);
    if (!correction) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (correction.status !== "PENDING") return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });

    const original = await store.getCredential(correction.credentialId);
    if (!original) return NextResponse.json({ error: "CREDENTIAL_NOT_FOUND" }, { status: 404 });

    const holder = await store.getUser(correction.studentUid);
    if (!holder || !canAccessInstitution(issuer, holder.institutionId) || !canAccessInstitution(issuer, original.institutionId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const reviewedAt = new Date().toISOString();

    if (parsed.data.decision === "REJECT") {
      await store.updateCorrection(id, { status: "REJECTED", reviewedBy: issuer.uid, reviewedAt });
      await store.logAudit({ action: "CORRECTION_REJECTED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: original.institutionId, targetId: id, occurredAt: reviewedAt });
      const email = holder
        ? await sendGmailNotification(holder.email, emailTemplates.correctionRejected(holder.name, correction.credentialId, parsed.data.rejectionReason).subject, emailTemplates.correctionRejected(holder.name, correction.credentialId, parsed.data.rejectionReason).text)
        : null;
      return NextResponse.json({ ok: true, status: "REJECTED", email });
    }

    // APPROVE: mint a new, independently-signed credential version.
    const issuerKey = getInstitutionIssuerKey();
    const newCredentialId = nextCredentialId();
    const issuedAt = reviewedAt;
    const updatedSubjectFields: Record<string, unknown> = { [toSubjectFieldKey(correction.field)]: correction.requestedValue };

    const unsigned = buildUnsignedCredential({
      credentialId: newCredentialId,
      issuerDid: issuerKey.did,
      holderDid: original.holderDid,
      holderName: holder?.name ?? original.vc.credentialSubject.holderName,
      credentialType: original.credentialType,
      title: original.vc.credentialSubject.title as string,
      institution: original.vc.credentialSubject.institution as string,
      issuanceDate: issuedAt,
      validUntil: original.validUntil,
      extraSubjectFields: { ...stripKnownFields(original.vc.credentialSubject), ...updatedSubjectFields },
    });
    const signedVc = signCredential(unsigned, issuerKey.privateKey, `${issuerKey.did}#key-1`);

    const newRecord: CredentialRecord = {
      credentialId: newCredentialId,
      holderUid: original.holderUid,
      holderDid: original.holderDid,
      issuerDid: issuerKey.did,
      institutionId: original.institutionId,
      credentialType: original.credentialType,
      status: "ACTIVE",
      version: original.version + 1,
      previousVersion: original.credentialId,
      vc: signedVc,
      issuedAt,
      validUntil: original.validUntil,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    };
    await store.createCredential(newRecord);
    await store.updateCredential(original.credentialId, { status: "SUPERSEDED", supersededBy: newCredentialId, updatedAt: reviewedAt });
    await store.updateCorrection(id, { status: "APPROVED", reviewedBy: issuer.uid, reviewedAt, newCredentialId });
    await store.logAudit({ action: "CORRECTION_APPROVED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: original.institutionId, targetId: id, occurredAt: reviewedAt });
    await store.logAudit({ action: "CREDENTIAL_SUPERSEDED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: original.institutionId, targetId: original.credentialId, occurredAt: reviewedAt });

    const verifyUrl = appUrl(`/verify?id=${newCredentialId}`);
    const email = holder
      ? await sendGmailNotification(holder.email, emailTemplates.correctionApproved(holder.name, original.credentialId, newCredentialId, verifyUrl).subject, emailTemplates.correctionApproved(holder.name, original.credentialId, newCredentialId, verifyUrl).text)
      : null;

    return NextResponse.json({ ok: true, status: "APPROVED", newCredential: newRecord, email });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

function toSubjectFieldKey(field: string): string {
  return field
    .trim()
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase());
}

function stripKnownFields(subject: Record<string, unknown>): Record<string, unknown> {
  const { id, holderName, credentialType, title, institution, ...rest } = subject;
  void id;
  void holderName;
  void credentialType;
  void title;
  void institution;
  return rest;
}
