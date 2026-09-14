"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, ScanLine, ShieldAlert, ShieldX } from "lucide-react";
import { verifyCredential } from "@/lib/client/api";
import type { VerificationResult } from "@/lib/vc/types";
import { Detail, PageHeading, StatusBadge } from "./ui-atoms";
import VLoader from "@/components/ui/VLoader";

const OUTCOME_TONE: Record<string, { icon: typeof BadgeCheck; className: string }> = {
  VERIFIED: { icon: BadgeCheck, className: "border-[#b5dfc9] bg-[#edf7f2] text-[#1c7c54]" },
  REVOKED: { icon: ShieldAlert, className: "border-[#f1c9c9] bg-[#fdeceb] text-[#c62828]" },
  SUPERSEDED: { icon: ShieldAlert, className: "border-[#c9d9ea] bg-[#eaf0f7] text-[#315b8c]" },
  EXPIRED: { icon: ShieldAlert, className: "border-[#f1d9c2] bg-[#fff5e8] text-[#9b641a]" },
  INVALID: { icon: ShieldX, className: "border-[#f1c9c9] bg-[#fdeceb] text-[#c62828]" },
  TAMPERED: { icon: ShieldX, className: "border-[#f1c9c9] bg-[#fdeceb] text-[#c62828]" },
  UNTRUSTED_ISSUER: { icon: ShieldX, className: "border-[#f1c9c9] bg-[#fdeceb] text-[#c62828]" },
  NOT_FOUND: { icon: ShieldX, className: "border-border bg-[#f5f6f8] text-muted" },
};

export function VerifyView({ initialCredentialId }: { initialCredentialId?: string }) {
  const [credentialId, setCredentialId] = useState(initialCredentialId ?? "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runVerification(id: string) {
    if (!id.trim()) return;
    setBusy(true);
    setError("");
    try {
      setResult(await verifyCredential({ credentialId: id.trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setResult(await verifyCredential({ credentialJson: json }));
    } catch {
      setError("Could not parse the uploaded file as credential JSON.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs verification once for a deep-linked ?id= on mount
    if (initialCredentialId) runVerification(initialCredentialId);
  }, [initialCredentialId]);

  const tone = result ? OUTCOME_TONE[result.outcome] ?? OUTCOME_TONE.NOT_FOUND : null;
  const Icon = tone?.icon;

  return (
    <>
      <PageHeading eyebrow="Public verification portal" title="Verify a credential" description="Check the authenticity and current status of a VIGYAN.ID credential. No account required." />
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-7 md:p-10">
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#fcecef] text-primary">
            <ScanLine />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">Credential lookup</h2>
            <p className="text-sm text-muted">Use a credential ID or upload the credential JSON.</p>
          </div>
        </div>

        <label className="mt-8 block text-xs font-bold uppercase tracking-[.14em] text-muted" htmlFor="credential-id">
          Credential ID
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="credential-id"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            placeholder="VC-2026-00124"
            className="min-w-0 flex-1 rounded-lg border border-border bg-[#fbfbfc] px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button disabled={busy} onClick={() => runVerification(credentialId)} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {busy ? <VLoader size={22} foreground="#FFFFFF" /> : "Verify"}
          </button>
        </div>

        {busy && <div className="mt-8 flex justify-center"><VLoader size={72} label="Verifying credential" /></div>}

        <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
          <ExternalLink size={15} />
          <span>Upload credential JSON instead</span>
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>

        {error && <p className="mt-4 text-sm font-semibold text-[#c62828]">{error}</p>}

        {result && tone && Icon && (
          <div className={`mt-8 rounded-xl border p-6 ${tone.className}`}>
            <div className="flex items-center gap-3">
              <Icon size={24} />
              <div>
                <p className="font-display text-xl font-bold">
                  {result.outcome === "VERIFIED" ? "Verified / Active" : result.outcome.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-sm">{result.message}</p>
              </div>
            </div>
            {result.credential && (
              <div className="mt-6 grid gap-4 border-t border-current/20 pt-5 sm:grid-cols-2">
                <Detail label="Credential ID" value={result.credential.credentialId} />
                <Detail label="Issuer DID" value={result.credential.issuerDid} />
                <Detail label="Holder DID" value={result.credential.holderDid} />
                <Detail label="Version" value={`v${result.credential.version}`} />
                {result.supersededBy && <Detail label="Superseded by" value={result.supersededBy} />}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">Status</p>
                  <div className="mt-2">
                    <StatusBadge status={result.credential.status} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
