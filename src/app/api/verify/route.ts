import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { verifyCredentialRecord } from "@/lib/vc/verify";
import type { VerifiableCredential } from "@/lib/vc/types";

const verifySchema = z.object({
  credentialId: z.string().min(1).max(80).optional(),
  credentialJson: z.unknown().optional(),
});

/**
 * Public credential verification. Deliberately requires NO authentication — this is the
 * verifier-facing endpoint. Only privacy-minimized metadata (credential ID, outcome,
 * timestamp) is written to the verification log; no verifier identity is captured.
 */
export async function POST(request: Request) {
  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_VERIFY_REQUEST" }, { status: 400 });
  if (!parsed.data.credentialId && !parsed.data.credentialJson) {
    return NextResponse.json({ error: "CREDENTIAL_ID_OR_JSON_REQUIRED" }, { status: 400 });
  }

  let credentialId = parsed.data.credentialId;
  let submittedVc: VerifiableCredential | undefined;

  if (parsed.data.credentialJson) {
    const vc = parsed.data.credentialJson as Partial<VerifiableCredential>;
    if (typeof vc.id !== "string" || !vc.id.startsWith("urn:vigyanid:credential:")) {
      return NextResponse.json({ result: { outcome: "INVALID", message: "Uploaded document is not a recognized VIGYAN ID credential.", checkedAt: new Date().toISOString() } });
    }
    credentialId = vc.id.replace("urn:vigyanid:credential:", "");
    submittedVc = vc as VerifiableCredential;
  }

  const record = credentialId ? await store.getCredential(credentialId) : null;
  const result = verifyCredentialRecord(record, submittedVc);

  await store.logVerification({ credentialId: result.credentialId, outcome: result.outcome, checkedAt: result.checkedAt });

  return NextResponse.json({ result });
}
