"use client";

import Link from "next/link";
import { VerifyView } from "@/components/verify-view";
import Image from "next/image";

export function VerifyPageClient({ initialCredentialId }: { initialCredentialId?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/v_logo.png" alt="VIGYAN.ID" width={150} height={41} className="h-auto w-[150px]" priority />
          </Link>
          <Link href="/" className="text-sm font-semibold text-muted hover:text-foreground">
            Sign in →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-12">
        <VerifyView initialCredentialId={initialCredentialId} />
      </main>
    </div>
  );
}
