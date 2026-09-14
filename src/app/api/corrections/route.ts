import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { canAccessInstitution, getSessionUser, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import type { CorrectionRequestRecord } from "@/lib/vc/types";
import { sendGmailNotification, emailTemplates } from "@/lib/gmail/send";
import { appUrl } from "@/lib/app-url";

const createSchema = z.object({
  credentialId: z.string().min(1),
  field: z.string().min(1).max(80),
  currentValue: z.string().min(1).max(200),
  requestedValue: z.string().min(1).max(200),
  reason: z.string().min(5).max(500),
  supportingDocumentPath: z.string().trim().min(1).max(300).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const allCorrections = user.role === "ISSUER" || user.role === "ADMIN" ? await store.listAllCorrections() : await store.listCorrectionsForStudent(user.uid);
  const corrections = user.role === "ADMIN" ? allCorrections : (await Promise.all(allCorrections.map(async (correction) => ({ correction, student: await store.getUser(correction.studentUid) })))).filter(({ student }) => student && canAccessInstitution(user, student.institutionId)).map(({ correction }) => correction);
  return NextResponse.json({ corrections });
}

export async function POST(request: Request) {
  try {
    const student = await requireRole("STUDENT");
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_CORRECTION_REQUEST", details: parsed.error.flatten() }, { status: 400 });

    const credential = await store.getCredential(parsed.data.credentialId);
    if (!credential || credential.holderUid !== student.uid) {
      return NextResponse.json({ error: "CREDENTIAL_NOT_FOUND" }, { status: 404 });
    }
    if (!canAccessInstitution(student, credential.institutionId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (credential.status !== "ACTIVE") {
      return NextResponse.json({ error: "CREDENTIAL_NOT_CORRECTABLE" }, { status: 409 });
    }

    const record: CorrectionRequestRecord = {
      id: `CR-${randomUUID().slice(0, 8).toUpperCase()}`,
      credentialId: parsed.data.credentialId,
      studentUid: student.uid,
      field: parsed.data.field,
      currentValue: parsed.data.currentValue,
      requestedValue: parsed.data.requestedValue,
      reason: parsed.data.reason,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    if (parsed.data.supportingDocumentPath !== undefined) {
      record.supportingDocumentPath = parsed.data.supportingDocumentPath;
    }
    await store.createCorrection(record);
    await store.logAudit({ action: "CORRECTION_SUBMITTED", actorUid: student.uid, actorRole: student.role, institutionId: credential.institutionId, targetId: record.id, occurredAt: record.createdAt });

    const reviewUrl = appUrl(`/issuer/corrections/${record.id}`);
    const template = emailTemplates.correctionSubmitted(student.profile.name, record.credentialId, record.field, reviewUrl);
    const registrarEmail = process.env.ISSUER_NOTIFICATION_EMAIL;
    const email = registrarEmail ? await sendGmailNotification(registrarEmail, template.subject, template.text) : ({ ok: false, reason: "EMAIL_NOT_CONFIGURED" } as const);

    return NextResponse.json({ correction: record, email });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
