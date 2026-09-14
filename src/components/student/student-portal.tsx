"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowUpRight, BookOpen, FileCheck2, LayoutDashboard, MoreHorizontal, Copy, WalletCards } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeading, Stat, StatusBadge } from "@/components/ui-atoms";
import { VerifyView } from "@/components/verify-view";
import { fetchCredentials } from "@/lib/client/api";
import { toDisplayCredential } from "@/lib/client/credential-ui";
import type { CredentialRecord } from "@/lib/vc/types";
import { CredentialDetailsView } from "./credential-details-view";
import { WalletView } from "./wallet-view";

type View = "dashboard" | "credentials" | "wallet" | "details" | "verify";

export function StudentPortal() {
  const { session } = useAuth();
  const { data: credentials, isLoading, mutate } = useSWR("credentials", fetchCredentials);
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openCredential(credentialId: string) {
    setSelectedId(credentialId);
    setView("details");
  }

  const active = (credentials ?? []).filter((c) => c.status === "ACTIVE");
  const selected = credentials?.find((c) => c.credentialId === selectedId) ?? active[0] ?? credentials?.[0];

  return (
    <DashboardShell<View>
      role="STUDENT"
      view={view}
      setView={setView}
      toast={toast}
      navItems={[
        { key: "dashboard", label: "Overview", icon: <LayoutDashboard /> },
        { key: "credentials", label: "My Credentials", icon: <FileCheck2 /> },
        { key: "wallet", label: "Digital Wallet", icon: <WalletCards /> },
      ]}
    >
      {view === "dashboard" && (
        <DashboardView active={active.length} did={session?.profile.did ?? ""} setView={setView} openCredential={openCredential} credentials={credentials ?? []} notify={notify} loading={isLoading} />
      )}
      {view === "credentials" && <CredentialListView credentials={credentials ?? []} loading={isLoading} openCredential={openCredential} />}
      {view === "wallet" && selected && <WalletView credential={selected} notify={notify} />}
      {view === "details" && selected && (
        <CredentialDetailsView
          credential={selected}
          onBack={() => setView("credentials")}
          notify={notify}
          onChanged={() => mutate()}
        />
      )}
      {view === "verify" && <VerifyView />}
    </DashboardShell>
  );
}

function DashboardView({
  active,
  did,
  setView,
  openCredential,
  credentials,
  notify,
  loading,
}: {
  active: number;
  did: string;
  setView: (v: View) => void;
  openCredential: (id: string) => void;
  credentials: CredentialRecord[];
  notify: (s: string) => void;
  loading: boolean;
}) {
  const { session } = useAuth();
  const firstName = session?.profile.name.split(" ")[0] ?? "there";
  const verified = session?.profile.status === "ACTIVE";

  function copyDid() {
    navigator.clipboard?.writeText(did);
    notify("DID copied to clipboard");
  }

  return (
    <>
      <div className="animate-rise">
        <PageHeading eyebrow="Student portal / overview" title={`Good to see you, ${firstName}.`} description="Your academic identity is active and ready to be shared. Keep your credentials close, verifiable, and entirely yours." />
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="animate-rise relative overflow-hidden rounded-2xl bg-[#172033] p-7 text-white md:p-9">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" style={{ zIndex: 0 }}>
            <span className="vg-blob absolute -right-16 -top-20 size-72 rounded-full bg-primary/25 blur-3xl" />
            <span className="vg-blob absolute -bottom-24 -left-14 size-64 rounded-full bg-primary/10 blur-3xl" style={{ animationDelay: "1.8s" }} />
            <span className="vg-sheen absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/5" />
          </div>
          <div className="relative" style={{ zIndex: 1 }}>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#aab3c2]">Identity status</p>
            <h2 className="mt-5 font-display text-3xl font-bold">{verified ? "Sovereign & verified" : session?.profile.status === "REJECTED" ? "Verification not approved" : "Verification pending"}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#c5cbd5]">{verified ? "Your identity is anchored to a decentralized identifier (did:key, Ed25519) and secured by your device key." : session?.profile.rejectionReason ?? "Your institutional identity is awaiting university verification. Credentials can be issued after approval."}</p>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
              <div>
                <p className="text-[10px] uppercase tracking-[.14em] text-[#aab3c2]">Your DID</p>
                <p className="mt-2 max-w-sm break-all font-mono text-xs">{did || "—"}</p>
              </div>
              <button onClick={copyDid} className="flex items-center gap-2 text-xs font-semibold text-[#8bd5b0] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95">
                <Copy size={14} /> Copy DID
              </button>
            </div>
          </div>
        </section>
        <section
          className="animate-rise rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_-30px_rgba(200,16,46,0.3)] md:p-9"
          style={{ animationDelay: "90ms" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Credential pulse</p>
            <MoreHorizontal size={18} className="text-muted" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5">
            <Stat value={loading ? "—" : String(active).padStart(2, "0")} label="Active credentials" />
            <Stat value={loading ? "—" : credentials.length ? "100%" : "0%"} label="Verification health" />
          </div>
          <button onClick={() => setView("verify")} className="group mt-8 flex w-full items-center gap-2 border-t border-border pt-5 text-xs font-semibold text-[#1c7c54] transition-colors">
            Verify a credential publicly <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </section>
      </div>
      <div className="mt-10">
        <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-muted">Recent credentials</p>
        <div className="flex flex-col gap-4">
          {credentials.slice(0, 3).map((c, i) => (
            <CredentialCard key={c.credentialId} credential={c} onClick={() => openCredential(c.credentialId)} delay={i * 70} />
          ))}
          {!loading && credentials.length === 0 && <p className="text-sm text-muted">No credentials issued yet.</p>}
        </div>
      </div>

      <style jsx>{`
        .vg-blob {
          animation: vgBlobPulse 6s ease-in-out infinite;
        }
        @keyframes vgBlobPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        .vg-sheen {
          animation: vgSheen 7s ease-in-out infinite;
        }
        @keyframes vgSheen {
          0% { transform: translateX(0) skewX(-12deg); }
          50% { transform: translateX(420%) skewX(-12deg); }
          100% { transform: translateX(0) skewX(-12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vg-blob, .vg-sheen { animation: none !important; }
        }
      `}</style>
    </>
  );
}

function CredentialListView({ credentials, loading, openCredential }: { credentials: CredentialRecord[]; loading: boolean; openCredential: (id: string) => void }) {
  return (
    <>
      <div className="animate-rise">
        <PageHeading eyebrow="Student portal / credentials" title="My credentials" description="A complete, signed record of your academic achievements. Each credential can be independently verified." />
      </div>
      <div className="mt-10 flex flex-col gap-4">
        {credentials.map((c, i) => (
          <CredentialCard key={c.credentialId} credential={c} onClick={() => openCredential(c.credentialId)} delay={i * 60} />
        ))}
        {!loading && credentials.length === 0 && <p className="text-sm text-muted">No credentials issued yet.</p>}
      </div>
    </>
  );
}

function CredentialCard({ credential, onClick, delay = 0 }: { credential: CredentialRecord; onClick: () => void; delay?: number }) {
  const display = toDisplayCredential(credential);
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-rise group rounded-2xl border border-border bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#d9a0aa] hover:shadow-[0_24px_50px_-28px_rgba(200,16,46,0.4)]"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[#fcecef] text-primary transition-transform duration-300 group-hover:scale-110">
          <BookOpen size={20} />
        </span>
        <StatusBadge status={display.status} />
      </div>
      <h3 className="mt-7 font-display text-xl font-bold">{display.title}</h3>
      <p className="mt-2 text-sm text-muted">{display.issuer}</p>
      <div className="mt-7 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
        <span>
          {display.credentialId} · v{display.version}
        </span>
        <span className="flex items-center gap-1 font-semibold text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
          Open <ArrowUpRight size={14} />
        </span>
      </div>
    </button>
  );
}