import type { CredentialRecord, CorrectionRequestRecord, VerificationResult } from "@/lib/vc/types";

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const fetchCredentials = () => fetch("/api/credentials").then((r) => asJson<{ credentials: CredentialRecord[] }>(r)).then((d) => d.credentials);

export const fetchCorrections = () => fetch("/api/corrections").then((r) => asJson<{ corrections: CorrectionRequestRecord[] }>(r)).then((d) => d.corrections);

export const fetchStudents = () =>
  fetch("/api/students").then((r) => asJson<{ students: { uid: string; name: string; email: string; did: string }[] }>(r)).then((d) => d.students);

export const fetchPendingStudents = () => fetch("/api/students/verification").then((r) => asJson<{ students: { uid: string; name: string; email: string; studentId?: string; program?: string; department?: string }[] }>(r)).then((d) => d.students);
export function reviewStudent(uid: string, decision: "APPROVE" | "REJECT", rejectionReason?: string) { return fetch("/api/students/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, decision, rejectionReason }) }).then((r) => asJson(r)); }
export function addStudent(payload: { name: string; studentId: string; email?: string; program: string; department?: string }) { return fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => asJson<{ student: { uid: string; name: string; studentId: string; status: string } }>(r)); }

export function verifyCredential(payload: { credentialId?: string; credentialJson?: unknown }) {
  return fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => asJson<{ result: VerificationResult }>(r)).then((d) => d.result);
}

export function issueCredential(payload: { holderUid: string; credentialType: string; title: string; validityYears?: number }) {
  return fetch("/api/credentials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) =>
    asJson<{ credential: CredentialRecord; email: { ok: boolean; reason?: string } }>(r),
  );
}

export function revokeCredential(credentialId: string, reason: string) {
  return fetch(`/api/credentials/${credentialId}/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }).then((r) => asJson(r));
}

export function createCorrection(payload: { credentialId: string; field: string; currentValue: string; requestedValue: string; reason: string }) {
  return fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => asJson<{ correction: CorrectionRequestRecord }>(r));
}

export function reviewCorrection(id: string, decision: "APPROVE" | "REJECT", rejectionReason?: string) {
  return fetch(`/api/corrections/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, rejectionReason }) }).then((r) => asJson(r));
}
