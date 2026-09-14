"use client";

import type { ReactNode } from "react";

export function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
        active ? "bg-[#fcecef] text-primary" : "text-muted hover:bg-[#f5f6f8] hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="animate-rise">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-[42px]">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-accent text-accent-foreground",
    ISSUED: "bg-accent text-accent-foreground",
    VERIFIED: "bg-accent text-accent-foreground",
    REVOKED: "bg-[#fdeceb] text-[#c62828]",
    INVALID: "bg-[#fdeceb] text-[#c62828]",
    TAMPERED: "bg-[#fdeceb] text-[#c62828]",
    UNTRUSTED_ISSUER: "bg-[#fdeceb] text-[#c62828]",
    SUPERSEDED: "bg-[#eaf0f7] text-[#315b8c]",
    EXPIRED: "bg-[#fff5e8] text-[#9b641a]",
    PENDING: "bg-[#fff5e8] text-[#9b641a]",
    APPROVED: "bg-accent text-accent-foreground",
    REJECTED: "bg-[#fdeceb] text-[#c62828]",
    NOT_FOUND: "bg-[#eef0f2] text-muted",
  };
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[status] ?? "bg-[#eef0f2] text-muted"}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#172033] px-5 py-3 text-sm text-white shadow-xl">
      {message}
    </div>
  );
}
