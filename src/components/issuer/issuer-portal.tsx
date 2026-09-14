"use client";

import { useState } from "react";
import useSWR from "swr";
import { Bell, FileCheck2, Inbox, ScanLine, ShieldAlert, Stamp, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Detail, PageHeading, StatusBadge } from "@/components/ui-atoms";
import { VerifyView } from "@/components/verify-view";
import { addStudent, fetchCorrections, fetchCredentials, fetchStudents, fetchPendingStudents, issueCredential, revokeCredential, reviewCorrection, reviewStudent } from "@/lib/client/api";
import { toDisplayCredential } from "@/lib/client/credential-ui";

type View = "pending" | "add-student" | "corrections" | "issue" | "credentials" | "verify";

export function IssuerPortal() {
  const [view, setView] = useState<View>("corrections");
  const [toast, setToast] = useState("");
  const { data: corrections, mutate: mutateCorrections } = useSWR("corrections", fetchCorrections);
  const { data: credentials, mutate: mutateCredentials } = useSWR("credentials", fetchCredentials);
  const { data: students } = useSWR("students", fetchStudents);
  const { data: pendingStudents, mutate: mutatePending } = useSWR("pending-students", fetchPendingStudents);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  const pending = (corrections ?? []).filter((c) => c.status === "PENDING");

  async function handleReview(id: string, decision: "APPROVE" | "REJECT") {
    try {
      await reviewCorrection(id, decision);
      notify(decision === "APPROVE" ? "Correction approved; new signed version issued" : "Correction rejected; student notified");
      mutateCorrections();
      mutateCredentials();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not process the review");
    }
  }

  async function handleRevoke(credentialId: string) {
    const reason = window.prompt("Reason for revocation:");
    if (!reason) return;
    try {
      await revokeCredential(credentialId, reason);
      notify(`${credentialId} revoked`);
      mutateCredentials();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not revoke credential");
    }
  }

  return (
    <DashboardShell<View>
      role="ISSUER"
      view={view}
      setView={setView}
      toast={toast}
      navItems={[
        { key: "pending", label: "Pending students", icon: <ShieldAlert /> },
        { key: "add-student", label: "Add student", icon: <UserPlus /> },
        { key: "corrections", label: "Correction queue", icon: <Inbox /> },
        { key: "issue", label: "Issue credential", icon: <Stamp /> },
        { key: "credentials", label: "All credentials", icon: <FileCheck2 /> },
      ]}
    >
      {view === "pending" && <PendingStudents students={pendingStudents ?? []} onReview={async (uid, decision) => { try { const reason = decision === "REJECT" ? window.prompt("Reason for rejection:") ?? "Not approved by the institution." : undefined; await reviewStudent(uid, decision, reason); mutatePending(); notify(decision === "APPROVE" ? "Student approved" : "Student rejected"); } catch (error) { notify(error instanceof Error ? error.message : "Could not review student"); } }} />}
      {view === "add-student" && <AddStudentForm onAdded={() => { mutatePending(); notify("Student added for verification"); }} />}
      {view === "corrections" && (
        <CorrectionsQueue corrections={pending} allCorrections={corrections ?? []} onReview={handleReview} />
      )}
      {view === "issue" && <IssueCredentialForm students={students ?? []} onIssued={() => { mutateCredentials(); notify("Credential signed and issued"); }} notify={notify} />}
      {view === "credentials" && <AllCredentials credentials={credentials ?? []} onRevoke={handleRevoke} />}
      {view === "verify" && <VerifyView />}
    </DashboardShell>
  );
}

function AddStudentForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await addStudent({ name, studentId, email: email || undefined, program, department: department || undefined });
      setName(""); setStudentId(""); setEmail(""); setProgram(""); setDepartment("");
      onAdded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add student";
      setError(message === "STUDENT_ID_ALREADY_EXISTS" ? "That institutional student ID already exists in this institution." : message === "FORBIDDEN" || message === "UNAUTHENTICATED" ? "You are not authorized to add students." : message);
    } finally {
      setBusy(false);
    }
  }

  return <><PageHeading eyebrow="Issuer workspace" title="Add student" description="Pre-register a student for institutional verification. Role, institution, and verification status are controlled by the server." /><form onSubmit={submit} className="mt-10 flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-7">
    <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">Full name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" /></label>
    <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">Institutional student ID / roll number<input required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" /></label>
    <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" /></label>
    <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">Program<input required value={program} onChange={(e) => setProgram(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" /></label>
    <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">Department<input value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" /></label>
    {error && <p className="rounded-lg bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#c62828]">{error}</p>}
    <button disabled={busy} type="submit" className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? "Adding student…" : "Add student for verification"}</button>
  </form></>;
}

function PendingStudents({ students, onReview }: { students: { uid: string; name: string; email: string; studentId?: string; program?: string; department?: string }[]; onReview: (uid: string, decision: "APPROVE" | "REJECT") => void }) {
  return <><PageHeading eyebrow="Issuer workspace" title="Pending student verification" description="Review institutional identity submissions before credentials can be issued." /><div className="mt-10 flex flex-col gap-4">{students.map((student) => <div key={student.uid} className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold">{student.name}</h2><p className="mt-1 text-sm text-muted">{student.email || "No email provided"}</p><p className="mt-3 text-xs text-muted">Student ID: {student.studentId ?? "Not provided"} · {student.program ?? "Program not provided"} · {student.department ?? "Department not provided"}</p></div><span className="rounded-full bg-[#fff5e8] px-3 py-1.5 text-[10px] font-bold uppercase text-[#9b641a]">Pending verification</span></div><div className="mt-5 flex gap-3 border-t border-border pt-5"><button onClick={() => onReview(student.uid, "APPROVE")} className="rounded-lg bg-[#1c7c54] px-4 py-2.5 text-sm font-bold text-white">Approve</button><button onClick={() => onReview(student.uid, "REJECT")} className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold">Reject</button></div></div>)}{students.length === 0 && <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">No students are waiting for verification.</p>}</div></>;
}

function CorrectionsQueue({ corrections, allCorrections, onReview }: { corrections: import("@/lib/vc/types").CorrectionRequestRecord[]; allCorrections: import("@/lib/vc/types").CorrectionRequestRecord[]; onReview: (id: string, d: "APPROVE" | "REJECT") => void }) {
  return (
    <>
      <PageHeading eyebrow="Issuer workspace" title="Correction queue" description="Review student requests and create append-only credential versions without altering historical records." />
      <div className="mt-10 flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#fcecef] text-primary">
            <Bell size={18} />
          </span>
          <div>
            <p className="font-bold">{corrections.length} request{corrections.length === 1 ? "" : "s"} need review</p>
            <p className="text-xs text-muted">{allCorrections.length} total correction requests on file</p>
          </div>
        </div>
        <span className="rounded-full bg-[#fff5e8] px-3 py-1.5 text-[10px] font-bold uppercase text-[#9b641a]">Pending</span>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {corrections.map((request) => (
          <div key={request.id} className="rounded-2xl border border-border bg-card p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-muted">Correction request {request.id}</p>
                <h2 className="mt-3 font-display text-2xl font-bold">{request.field}</h2>
                <p className="mt-1 text-xs text-muted">Credential {request.credentialId}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Detail label="Current value" value={request.currentValue} />
              <Detail label="Requested value" value={request.requestedValue} />
              <Detail label="Reason" value={request.reason} />
              <Detail label="Workflow" value="Approve creates a new signed version; original becomes SUPERSEDED" />
            </div>
            <div className="mt-7 flex gap-3 border-t border-border pt-6">
              <button onClick={() => onReview(request.id, "APPROVE")} className="rounded-lg bg-[#1c7c54] px-4 py-3 text-sm font-bold text-white">
                Approve &amp; reissue
              </button>
              <button onClick={() => onReview(request.id, "REJECT")} className="rounded-lg border border-border px-4 py-3 text-sm font-bold">
                Reject request
              </button>
            </div>
          </div>
        ))}
        {corrections.length === 0 && <p className="rounded-2xl border border-border bg-card p-7 text-sm text-muted">No pending correction requests.</p>}
      </div>
    </>
  );
}

function IssueCredentialForm({ students, onIssued, notify }: { students: { uid: string; name: string; email: string; did: string }[]; onIssued: () => void; notify: (s: string) => void }) {
  const [holderUid, setHolderUid] = useState("");
  const [credentialType, setCredentialType] = useState("BachelorDegree");
  const [title, setTitle] = useState("");
  const [validityYears, setValidityYears] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [lastIssuedId, setLastIssuedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!holderUid || !title) return;
    setSubmitting(true);
    try {
      const { credential, email } = await issueCredential({ holderUid, credentialType, title, validityYears });
      setLastIssuedId(credential.credentialId);
      onIssued();
      if (!email.ok) notify(`Credential issued. Email notification: ${email.reason ?? "not sent"}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not issue credential");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="Issuer workspace" title="Issue a new credential" description="Select a student, describe the credential, and sign it with the institution's Ed25519 issuer key." />
      <form onSubmit={submit} className="mt-10 flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-7">
        <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
          Student
          <select required value={holderUid} onChange={(e) => setHolderUid(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary">
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
          Credential type
          <select value={credentialType} onChange={(e) => setCredentialType(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary">
            <option value="BachelorDegree">Bachelor Degree</option>
            <option value="MasterDegree">Master Degree</option>
            <option value="CourseCertificate">Course Certificate</option>
            <option value="Diploma">Diploma</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
          Credential title
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bachelor of Technology, Computer Science" className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
          Validity (years)
          <input type="number" min={0} max={50} value={validityYears} onChange={(e) => setValidityYears(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" />
        </label>
        <button disabled={submitting} type="submit" className="mt-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
          {submitting ? "Signing & issuing…" : "Sign & issue credential"}
        </button>
        {lastIssuedId && (
          <p className="rounded-lg bg-[#edf7f2] px-4 py-3 text-sm font-semibold text-[#1c7c54]">
            Issued {lastIssuedId}. <a className="underline" href={`/verify?id=${lastIssuedId}`} target="_blank" rel="noreferrer">View verification page →</a>
          </p>
        )}
      </form>
    </>
  );
}

function AllCredentials({ credentials, onRevoke }: { credentials: import("@/lib/vc/types").CredentialRecord[]; onRevoke: (id: string) => void }) {
  return (
    <>
      <PageHeading eyebrow="Issuer workspace" title="All issued credentials" description="Every credential this institution has signed, including superseded and revoked versions." />
      <div className="mt-10 flex flex-col gap-4">
        {credentials.map((c) => {
          const display = toDisplayCredential(c);
          return (
            <div key={c.credentialId} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
              <div>
                <p className="font-display text-lg font-bold">{display.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {display.credentialId} · v{display.version} · {display.holder}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={display.status} />
                {display.status === "ACTIVE" && (
                  <button onClick={() => onRevoke(c.credentialId)} className="flex items-center gap-1.5 rounded-lg border border-[#f1c9c9] px-3 py-2 text-xs font-bold text-[#c62828]">
                    <ShieldAlert size={14} /> Revoke
                  </button>
                )}
                <a href={`/verify?id=${c.credentialId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold">
                  <ScanLine size={14} /> Verify
                </a>
              </div>
            </div>
          );
        })}
        {credentials.length === 0 && <p className="text-sm text-muted">No credentials issued yet.</p>}
      </div>
    </>
  );
}
