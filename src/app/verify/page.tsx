import type { Metadata } from "next";
import { VerifyPageClient } from "./verify-page-client";

export const metadata: Metadata = { title: "Verify a credential — VIGYAN.ID" };

export default async function PublicVerifyPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <VerifyPageClient initialCredentialId={id} />;
}
