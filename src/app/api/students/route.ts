import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { canAccessInstitution, requireRole, SessionError } from "@/lib/auth/session";
import { store } from "@/lib/store";
import { generateEd25519KeyPair } from "@/lib/crypto/ed25519";

const addSchema = z.object({ name: z.string().min(2).max(120), studentId: z.string().min(1).max(80), email: z.string().email().optional(), program: z.string().min(2).max(160), department: z.string().max(160).optional() });

export async function GET() {
  try {
    const issuer = await requireRole("ISSUER", "ADMIN");
    const students = await store.listStudents();
    return NextResponse.json({ students: students.filter((student) => canAccessInstitution(issuer, student.institutionId)).map((s) => ({ uid: s.uid, name: s.name, email: s.email, did: s.did })) });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const issuer = await requireRole("ISSUER", "ADMIN");
    const parsed = addSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_STUDENT_REQUEST" }, { status: 400 });
    if (await store.findStudentByInstitutionId(issuer.profile.institutionId, parsed.data.studentId)) return NextResponse.json({ error: "STUDENT_ID_ALREADY_EXISTS" }, { status: 409 });
    const keys = generateEd25519KeyPair();
    const now = new Date().toISOString();
    const student = { uid: `pre-${randomUUID()}`, name: parsed.data.name, email: parsed.data.email ?? "", role: "STUDENT" as const, did: keys.did, publicKeyMultibase: keys.publicKeyMultibase, institutionId: issuer.profile.institutionId, status: "PENDING_VERIFICATION" as const, studentId: parsed.data.studentId, program: parsed.data.program, department: parsed.data.department, createdAt: now, updatedAt: now };
    await store.upsertUser(student);
    await store.logAudit({ action: "STUDENT_PRE_REGISTERED", actorUid: issuer.uid, actorRole: issuer.role, institutionId: student.institutionId, targetId: student.uid, occurredAt: now });
    return NextResponse.json({ student: { uid: student.uid, name: student.name, email: student.email, studentId: student.studentId, program: student.program, department: student.department, status: student.status } });
  } catch (error) {
    if (error instanceof SessionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
