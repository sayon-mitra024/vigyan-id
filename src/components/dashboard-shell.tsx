"use client";

import { useState, type ReactNode } from "react";
import { Bell, FileCheck2, LayoutDashboard, Menu, ScanLine, Settings, ShieldCheck, WalletCards, X, LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";
import { NavItem, Toast } from "./ui-atoms";
import Image from "next/image";

export type StudentView = "dashboard" | "credentials" | "wallet" | "details" | "verify";
export type IssuerView = "issue" | "corrections" | "verify";

export function DashboardShell<V extends string>({
  role,
  view,
  setView,
  navItems,
  children,
  toast,
}: {
  role: "STUDENT" | "ISSUER" | "ADMIN";
  view: V;
  setView: (v: V) => void;
  navItems: { key: V; label: string; icon: ReactNode }[];
  children: ReactNode;
  toast: string;
}) {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = (session?.profile.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
          <div className="flex items-center gap-3">
            <Image src="/v_logo.png" alt="VIGYAN.ID" width={150} height={41} className="h-auto w-[150px]" priority />
            <span className="font-display text-[17px] font-bold tracking-[.12em]">
              <small className="ml-3 hidden text-[9px] font-semibold tracking-[.16em] text-muted md:inline">CHANDIGARH UNIVERSITY</small>
            </span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <span className="rounded-full bg-[#f5f6f8] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-muted">{role}</span>
            <span className="h-5 w-px bg-border" />
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#d7e7df] text-xs font-bold text-[#1c7c54]">{initials}</span>
              {session?.profile.name}
            </span>
            <button aria-label="Notifications" className="text-muted">
              <Bell size={19} />
            </button>
            <button onClick={logout} aria-label="Sign out" className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground">
              <LogOut size={15} /> Sign out
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-3 border-t border-border px-5 py-4 md:hidden">
            {navItems.map((item) => (
              <NavItem key={item.key} icon={item.icon} label={item.label} active={view === item.key} onClick={() => { setView(item.key); setMenuOpen(false); }} />
            ))}
            <NavItem icon={<LogOut />} label="Sign out" onClick={logout} />
          </nav>
        )}
      </header>
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden w-[244px] shrink-0 border-r border-border bg-card px-5 py-8 md:block">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">{role === "STUDENT" ? "Student portal" : "Issuer workspace"}</p>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem key={item.key} icon={item.icon} label={item.label} active={view === item.key} onClick={() => setView(item.key)} />
            ))}
          </div>
          <p className="mb-4 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Tools</p>
          <NavItem icon={<ScanLine />} label="Verify a credential" onClick={() => window.open("/verify", "_blank")} />
          <NavItem icon={<Settings />} label="Settings" onClick={() => {}} />
          <div className="mt-20 rounded-xl border border-border bg-[#fbfbfc] p-4">
            <p className="flex items-center gap-2 text-xs font-bold">
              <ShieldCheck size={16} className="text-[#1c7c54]" /> Identity protected
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted">Your credentials are cryptographically signed and tamper-evident.</p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 md:px-12 md:py-12">{children}</main>
      </div>
      <Toast message={toast} />
    </div>
  );
}

export const studentNavIcons = { LayoutDashboard, FileCheck2, WalletCards };
