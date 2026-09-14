"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link2, QrCode, ShieldAlert } from "lucide-react";
import { PageHeading } from "@/components/ui-atoms";
import { toDisplayCredential } from "@/lib/client/credential-ui";
import type { CredentialRecord } from "@/lib/vc/types";

const DISCLOSABLE_FIELDS = ["Credential title", "Issuer institution", "Issue date", "Holder name"];

export function WalletView({ credential, notify }: { credential: CredentialRecord; notify: (s: string) => void }) {
  const display = toDisplayCredential(credential);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(DISCLOSABLE_FIELDS.map((f) => [f, true])));
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/verify?id=${credential.credentialId}` : "";

  useEffect(() => {
    if (!verifyUrl) return;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 320, color: { dark: "#172033", light: "#ffffff" } }).then(setQrDataUrl);
  }, [verifyUrl]);

  function createLink() {
    navigator.clipboard?.writeText(verifyUrl);
    notify("Verification link copied — share it with anyone who needs to check this credential");
  }

  return (
    <>
      <div className="animate-rise">
        <PageHeading eyebrow="Student portal / digital wallet" title="Your digital wallet" description="Present only what is needed. Share a verified credential with a person or organization you trust." />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="animate-rise relative overflow-hidden rounded-2xl bg-[#172033] p-7 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" style={{ zIndex: 0 }}>
            <span className="vg-blob absolute -right-12 -top-16 size-64 rounded-full bg-primary/25 blur-3xl" />
            <span className="vg-blob absolute -bottom-24 -left-10 size-56 rounded-full bg-primary/10 blur-3xl" style={{ animationDelay: "1.6s" }} />
            <span className="vg-sheen absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/5" />
          </div>

          <div className="relative" style={{ zIndex: 1 }}>
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold tracking-[.14em]">
                VIGYAN<span className="text-[#f26a7e]">.ID</span>
              </span>
              <div className="vg-qr-frame relative rounded-2xl bg-white p-2.5">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR code linking to verification for ${credential.credentialId}`} className="size-28 rounded-lg sm:size-32" />
                ) : (
                  <span className="flex size-28 items-center justify-center sm:size-32">
                    <QrCode size={36} className="text-[#8bd5b0]" />
                  </span>
                )}
              </div>
            </div>
            <div className="mt-16">
              <p className="text-xs text-[#aab3c2]">PRESENTATION CREDENTIAL</p>
              <h2 className="mt-3 font-display text-2xl font-bold">{display.title}</h2>
              <p className="mt-2 text-sm text-[#c5cbd5]">
                {display.holder} · {display.issuer}
              </p>
            </div>
            <div className="mt-10 border-t border-white/15 pt-4 font-mono text-xs text-[#aab3c2]">
              {display.credentialId} / v{display.version}
            </div>
          </div>
        </div>

        <div className="animate-rise rounded-2xl border border-border bg-card p-7 transition-shadow duration-300 hover:shadow-[0_20px_50px_-30px_rgba(200,16,46,0.3)]" style={{ animationDelay: "80ms" }}>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">Selective disclosure</p>
          <h2 className="mt-3 font-display text-2xl font-bold">Choose what to share</h2>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff5e8] p-3 text-[11px] leading-5 text-[#7a4a12]">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              <strong>Prototype only.</strong> Toggling fields below controls what this preview highlights — it is not cryptographic (SD-JWT/BBS)
              selective disclosure. The verification link always resolves the full, signed credential.
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-1">
            {DISCLOSABLE_FIELDS.map((item) => (
              <label key={item} className="flex items-center justify-between rounded-lg border-b border-border px-2 py-4 text-sm transition-colors duration-150 hover:bg-[#fcecef]/40">
                <span>{item}</span>
                <input type="checkbox" checked={selected[item]} onChange={(e) => setSelected((prev) => ({ ...prev, [item]: e.target.checked }))} className="size-4 accent-[#c8102e] transition-transform duration-150 hover:scale-110" />
              </label>
            ))}
          </div>
          <button
            onClick={createLink}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(200,16,46,0.6)] active:translate-y-0 active:scale-[0.98]"
          >
            <Link2 size={16} /> Copy verification link
          </button>
        </div>
      </div>

      <style jsx>{`
        .vg-qr-frame {
          animation: vgRingPulse 2.6s ease-out infinite;
        }
        @keyframes vgRingPulse {
          0% { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0.35); }
          70% { box-shadow: 0 0 0 12px rgba(200, 16, 46, 0); }
          100% { box-shadow: 0 0 0 0 rgba(200, 16, 46, 0); }
        }
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
          .vg-qr-frame, .vg-blob, .vg-sheen { animation: none !important; }
        }
      `}</style>
    </>
  );
}