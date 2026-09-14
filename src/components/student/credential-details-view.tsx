"use client";

import { useState } from "react";
import { BadgeCheck, Copy, Download, FileText, History, Send } from "lucide-react";
import { Detail, PageHeading, StatusBadge } from "@/components/ui-atoms";
import { createCorrection } from "@/lib/client/api";
import { downloadCertificate, downloadJson, toDisplayCredential } from "@/lib/client/credential-ui";
import type { CredentialRecord } from "@/lib/vc/types";

export function CredentialDetailsView({
  credential,
  onBack,
  notify,
  onChanged,
}: {
  credential: CredentialRecord;
  onBack: () => void;
  notify: (s: string) => void;
  onChanged: () => void;
}) {
  const display = toDisplayCredential(credential);
  const [copied, setCopied] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [field, setField] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify?id=${credential.credentialId}`;

  function copyId() {
    navigator.clipboard?.writeText(credential.credentialId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCorrection({ credentialId: credential.credentialId, field, currentValue, requestedValue, reason });
      notify("Correction request submitted to the issuer");
      setShowCorrection(false);
      setField("");
      setCurrentValue("");
      setRequestedValue("");
      setReason("");
      onChanged();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not submit correction request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={onBack}
        className="group mb-8 flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span> Back to credentials
      </button>
      <div className="animate-rise">
        <PageHeading eyebrow="Credential / verified record" title={display.title} description="This credential is signed by the issuing institution and can be verified independently." />
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div
          className="animate-rise relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(23,32,51,0.04)] transition-shadow duration-300 hover:shadow-[0_24px_60px_-32px_rgba(200,16,46,0.35)]"
          style={{ animationDelay: "60ms" }}
        >
          <span aria-hidden className="vg-shimmer-bar absolute inset-x-0 top-0 h-[3px]" />
          <div className="flex items-center justify-between border-b border-border pb-5">
            <span className="text-xs font-bold uppercase tracking-[.14em] text-muted">Credential detail</span>
            <StatusBadge status={display.status} />
          </div>
          <div className="grid gap-6 py-7 sm:grid-cols-2">
            <Detail label="Credential ID" value={display.credentialId} />
            <Detail label="Credential type" value={display.credentialType} />
            <Detail label="Holder" value={display.holder} />
            <Detail label="Issued by" value={display.issuer} />
            <Detail label="Issued on" value={display.issuedAt} />
            <Detail label="Valid until" value={display.validUntil} />
            <Detail label="Version" value={`v${display.version}`} />
            {display.previousVersion && <Detail label="Supersedes" value={display.previousVersion} />}
            {display.supersededBy && <Detail label="Superseded by" value={display.supersededBy} />}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <button
              onClick={() => { downloadJson(`${credential.credentialId}.json`, credential.vc); notify("Signed credential JSON downloaded"); }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(200,16,46,0.6)] active:translate-y-0 active:scale-[0.98]"
            >
              <Download size={16} /> Download JSON
            </button>
            <button
              onClick={() => { downloadCertificate(credential, verifyUrl); notify("Certificate downloaded"); }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_24px_-14px_rgba(200,16,46,0.4)] active:translate-y-0 active:scale-[0.98]"
            >
              <FileText size={16} /> Download certificate
            </button>
            <button
              onClick={copyId}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 active:translate-y-0 active:scale-[0.98]"
            >
              {copied ? <BadgeCheck size={16} className="text-primary" /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy ID"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div
            className="animate-rise rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_-30px_rgba(200,16,46,0.3)]"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#fcecef] text-primary transition-transform duration-300">
                <History size={18} />
              </span>
              <h3 className="font-display text-lg font-bold">Request a correction</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Corrections never modify this record. Approval mints a newly signed credential and marks this one SUPERSEDED.
            </p>
            {display.status !== "ACTIVE" ? (
              <p className="mt-5 text-xs font-semibold text-muted">Only ACTIVE credentials can have a correction requested.</p>
            ) : !showCorrection ? (
              <button
                onClick={() => setShowCorrection(true)}
                className="mt-5 flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_24px_-14px_rgba(200,16,46,0.4)] active:translate-y-0 active:scale-[0.98]"
              >
                <Send size={16} /> Request correction
              </button>
            ) : (
              <form onSubmit={submitCorrection} className="animate-rise mt-5 flex flex-col gap-3 text-sm">
                <input required value={field} onChange={(e) => setField(e.target.value)} placeholder="Field (e.g. Date of Birth)" className="rounded-xl border border-border bg-[#fbfbfc] px-3 py-2.5 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10" />
                <input required value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="Current value" className="rounded-xl border border-border bg-[#fbfbfc] px-3 py-2.5 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10" />
                <input required value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} placeholder="Requested value" className="rounded-xl border border-border bg-[#fbfbfc] px-3 py-2.5 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10" />
                <textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for correction" rows={3} className="rounded-xl border border-border bg-[#fbfbfc] px-3 py-2.5 outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10" />
                <div className="flex gap-2">
                  <button disabled={submitting} type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(200,16,46,0.6)] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                    {submitting ? "Submitting…" : "Submit request"}
                  </button>
                  <button type="button" onClick={() => setShowCorrection(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div
            className="animate-rise rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_-30px_rgba(200,16,46,0.3)]"
            style={{ animationDelay: "180ms" }}
          >
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-muted">
              <span aria-hidden className="vg-dot size-1.5 rounded-full bg-primary" />
              Proof
            </p>
            <p className="mt-3 break-all font-mono text-[11px] leading-5 text-muted">{credential.vc.proof?.proofValue.slice(0, 90)}…</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .vg-shimmer-bar {
          background: linear-gradient(90deg, rgba(200, 16, 46, 0.08), rgba(200, 16, 46, 0.85), rgba(200, 16, 46, 0.08));
          background-size: 200% 100%;
          animation: vgShimmer 3.2s ease-in-out infinite;
        }
        @keyframes vgShimmer {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        .vg-dot {
          box-shadow: 0 0 0 0 rgba(200, 16, 46, 0.5);
          animation: vgPulseDot 2.2s ease-out infinite;
        }
        @keyframes vgPulseDot {
          0% { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0.45); }
          70% { box-shadow: 0 0 0 6px rgba(200, 16, 46, 0); }
          100% { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vg-shimmer-bar, .vg-dot { animation: none !important; }
        }
      `}</style>
    </>
  );
}