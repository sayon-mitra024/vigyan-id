import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessInstitution, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { emailTemplates, sendGmailNotification } from "@/lib/gmail/send";

const reviewSchema = z.object({ uid: z.string().min(1), decision: z.enum(["APPROVE", "REJECT"]), rejectionReason: z.string().trim().min(1).max(500).optional() });

export async function GET() {
  try {
    const reviewer = await requireRole("ISSUER", "ADMIN");
    const students = await store.listStudents();
    return NextResponse.json({ students: students.filter((student) => student.status === "PENDING_VERIFICATION" && canAccessInstitution(reviewer, student.institutionId)).map(publicStudent) });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const reviewer = await requireRole("ISSUER", "ADMIN");
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_VERIFICATION_REQUEST" }, { status: 400 });
    const student = await store.getUser(parsed.data.uid);
    if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    if (!canAccessInstitution(reviewer, student.institutionId)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (student.status !== "PENDING_VERIFICATION") return NextResponse.json({ error: "STUDENT_ALREADY_REVIEWED" }, { status: 409 });
    const now = new Date().toISOString();
    const rejectionReason = parsed.data.rejectionReason ?? "Not approved by the institution.";
    const reviewedStudent = parsed.data.decision === "APPROVE"
      ? { ...student, status: "ACTIVE" as const, verifiedAt: now, verifiedBy: reviewer.uid, updatedAt: now }
      : { ...student, status: "REJECTED" as const, verifiedBy: reviewer.uid, rejectionReason, updatedAt: now };
    await store.upsertUser(removeUndefinedFields(reviewedStudent));
    await store.logAudit({ action: parsed.data.decision === "APPROVE" ? "STUDENT_APPROVED" : "STUDENT_REJECTED", actorUid: reviewer.uid, actorRole: reviewer.role, institutionId: student.institutionId, targetId: student.uid, occurredAt: now });
    const template = parsed.data.decision === "APPROVE" ? emailTemplates.studentApproved(student.name) : emailTemplates.studentRejected(student.name, rejectionReason);
    const email = student.email ? await sendGmailNotification(student.email, template.subject, template.text) : { ok: false as const, reason: "EMAIL_NOT_CONFIGURED" as const };
    return NextResponse.json({ student: { ...publicStudent({ ...student, status: parsed.data.decision === "APPROVE" ? "ACTIVE" : "REJECTED" }) }, email });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function publicStudent(student: Awaited<ReturnType<typeof store.getUser>>) {
  if (!student) return null;
  return { uid: student.uid, name: student.name, email: student.email, institutionId: student.institutionId, status: student.status, studentId: student.studentId, program: student.program, department: student.department, rejectionReason: student.rejectionReason };
}
