"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { useAuth } from "./auth-provider";
import Image from "next/image";
import VLoader from "@/components/ui/VLoader";

type Mode = "student-login" | "student-signup" | "issuer-login";

export function LoginScreen() {
  const router = useRouter();
  const { firebaseConfigured, loginWithEmailPassword, signUpStudent, loginDemo } = useAuth();
  const [mode, setMode] = useState<Mode>("student-login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = mode === "student-signup" ? await signUpStudent(name, email, password) : await loginWithEmailPassword(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else router.replace("/");
  }

  async function enterDemo(demoUid: "demo-student-aarav" | "demo-issuer-registrar") {
    setError("");
    setBusy(true);
    const result = await loginDemo(demoUid);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 md:p-10">
        <div className="flex justify-center"><Image src="/v_logo.png" alt="VIGYAN.ID" width={220} height={60} className="h-auto w-[220px]" priority /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-primary">Issue. Own. Share. Verify.</p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {mode === "issuer-login" ? "Issuer sign in" : mode === "student-signup" ? "Create your student account" : "Student sign in"}
        </h1>

        {!firebaseConfigured && (
          <div className="mt-6 rounded-xl border border-[#f1d9c2] bg-[#fff5e8] p-4 text-xs leading-5 text-[#7a4a12]">
            <p className="font-bold">Firebase is not configured for this deployment.</p>
            <p className="mt-1">Email/password sign-in is unavailable. Continue in demo mode below to explore every workflow with real cryptographic signing on isolated demo data.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button disabled={busy} onClick={() => enterDemo("demo-student-aarav")} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                Continue as demo student
              </button>
              <button disabled={busy} onClick={() => enterDemo("demo-issuer-registrar")} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold disabled:opacity-60">
                Continue as demo issuer
              </button>
            </div>
          </div>
        )}

        {firebaseConfigured && (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === "student-signup" && (
              <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" />
              </label>
            )}
            <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" />
            </label>
            <label className="text-xs font-bold uppercase tracking-[.14em] text-muted">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-2 w-full rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary" />
            </label>
            {error && <p className="text-xs font-semibold text-[#c62828]">{error}</p>}
            <button disabled={busy} type="submit" className="mt-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? <span className="flex items-center justify-center"><VLoader size={22} foreground="#FFFFFF" /></span> : mode === "student-signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 text-xs font-semibold text-primary">
          {mode !== "student-login" && <button onClick={() => setMode("student-login")}>Sign in as a student</button>}
          {mode !== "student-signup" && <button onClick={() => setMode("student-signup")}>Create a new student account</button>}
          {mode !== "issuer-login" && (
            <button onClick={() => setMode("issuer-login")}>Sign in as issuer / university staff</button>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-[#fbfbfc] p-4 text-[11px] leading-5 text-muted">
          <ShieldCheck size={16} className="shrink-0 text-[#1c7c54]" />
          Issuer accounts are provisioned by the institution administrator and are not self-service.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted">
          <Fingerprint size={14} /> Public verification never requires an account. <a className="font-semibold text-primary" href="/verify">Verify a credential →</a>
        </div>
      </div>
    </div>
  );
}
