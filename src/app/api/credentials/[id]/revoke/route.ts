import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessInstitution, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { sendGmailNotification, emailTemplates } from "@/lib/gmail/send";
import { appUrl } from "@/lib/app-url";

const revokeSchema = z.object({ reason: z.string().min(3).max(300) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const issuer = await requireRole("ISSUER", "ADMIN");
    const { id } = await params;
    const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REVOKE_REQUEST" }, { status: 400 });

    const credential = await store.getCredential(id);
    if (!credential) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (!canAccessInstitution(issuer, credential.institutionId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (credential.status === "REVOKED") return NextResponse.json({ error: "ALREADY_REVOKED" }, { status: 409 });

    const revokedAt = new Date().toISOString();
    await store.updateCredential(id, { status: "REVOKED", revokedAt, revokedReason: parsed.data.reason, updatedAt: revokedAt });
    await store.logAudit({ action: "CREDENTIAL_REVOKED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: credential.institutionId, targetId: id, occurredAt: revokedAt });

    const holder = await store.getUser(credential.holderUid);
    const verifyUrl = appUrl(`/verify?id=${id}`);
    let email = null;
    if (holder) {
      const template = emailTemplates.credentialRevoked(holder.name, id, verifyUrl);
      email = await sendGmailNotification(holder.email, template.subject, template.text);
    }

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
