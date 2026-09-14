import { base64UrlToBytes, publicKeyFromDid, verifyBytes } from "@/lib/crypto/ed25519";
import { canonicalBytes } from "./canonicalize";
import type { CredentialRecord, VerifiableCredential, VerificationResult } from "./types";

const TRUSTED_ISSUER_DIDS = new Set(
  (process.env.TRUSTED_ISSUER_DIDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
);

function isStructurallyValid(vc: unknown): vc is VerifiableCredential {
  if (!vc || typeof vc !== "object") return false;
  const c = vc as Partial<VerifiableCredential>;
  return (
    Array.isArray(c["@context"]) &&
    typeof c.id === "string" &&
    Array.isArray(c.type) &&
    typeof c.issuer === "string" &&
    typeof c.issuanceDate === "string" &&
    !!c.credentialSubject &&
    typeof c.credentialSubject.id === "string" &&
    !!c.proof &&
    c.proof.type === "Ed25519Signature2020" &&
    typeof c.proof.proofValue === "string" &&
    typeof c.proof.verificationMethod === "string" &&
    c.proof.proofPurpose === "assertionMethod"
  );
}

/**
 * Independently re-derives the signed message from the credential fields (never trusts
 * a client-supplied boolean) and verifies the Ed25519 signature against the public key
 * encoded in the issuer's did:key. Any mutation to any credential field invalidates the
 * signature because the canonicalized payload changes.
 */
export function verifySignature(vc: VerifiableCredential): boolean {
  if (!vc.proof) return false;
  const { proof, ...unsigned } = vc;
  if (proof.type !== "Ed25519Signature2020" || !proof.proofValue.startsWith("z") || !proof.verificationMethod.startsWith(`${vc.issuer}#`)) return false;
  let publicKey: Uint8Array;
  try {
    publicKey = publicKeyFromDid(vc.issuer);
  } catch {
    return false;
  }
  const message = canonicalBytes(unsigned);
  const signature = base64UrlToBytes(proof.proofValue.slice(1));
  return verifyBytes(signature, message, publicKey);
}

export function isTrustedIssuer(issuerDid: string): boolean {
  if (TRUSTED_ISSUER_DIDS.size === 0) return true; // no allow-list configured: trust any structurally valid did:key issuer
  return TRUSTED_ISSUER_DIDS.has(issuerDid);
}

/**
 * Full verification pipeline against a resolved credential record (looked up by ID, so
 * a verifier cannot bypass revocation/supersession checks by supplying an arbitrary
 * standalone JSON document without the record's lifecycle state).
 */
export function verifyCredentialRecord(record: CredentialRecord | null, submittedVc?: VerifiableCredential): VerificationResult {
  const checkedAt = new Date().toISOString();
  if (!record) return { outcome: "NOT_FOUND", message: "No credential found with this identifier.", checkedAt };

  const vcToCheck = submittedVc ?? record.vc;

  if (record.vc.issuer !== record.issuerDid || record.vc.credentialSubject.id !== record.holderDid) {
    return { outcome: "INVALID", credentialId: record.credentialId, message: "Credential metadata does not match its signed issuer or holder identity.", checkedAt };
  }

  if (!isStructurallyValid(vcToCheck)) {
    return { outcome: "INVALID", credentialId: record.credentialId, message: "Credential structure does not match the expected Verifiable Credential schema.", checkedAt };
  }

  if (!isTrustedIssuer(vcToCheck.issuer)) {
    return { outcome: "UNTRUSTED_ISSUER", credentialId: record.credentialId, message: `Issuer DID ${vcToCheck.issuer} is not in the trusted issuer registry.`, checkedAt };
  }

  const signatureValid = verifySignature(vcToCheck);
  if (!signatureValid) {
    return { outcome: "INVALID", credentialId: record.credentialId, message: "Digital signature verification failed. The credential contents do not match what the issuer signed.", checkedAt };
  }

  // If the caller supplied their own VC JSON, it must also match the canonical stored
  // record byte-for-byte, otherwise a tampered-but-re-signed-with-a-different-issuer
  // document could pass its own signature check while diverging from the real record.
  if (submittedVc) {
    const submittedCanonical = canonicalBytes({ ...submittedVc, proof: undefined });
    const storedCanonical = canonicalBytes({ ...record.vc, proof: undefined });
    if (!bytesEqual(submittedCanonical, storedCanonical) || submittedVc.issuer !== record.vc.issuer) {
      return { outcome: "TAMPERED", credentialId: record.credentialId, message: "The supplied credential does not match the authentic record on file for this ID, even though it is self-signed.", checkedAt };
    }
  }

  const issuanceTime = Date.parse(vcToCheck.issuanceDate);
  if (!Number.isFinite(issuanceTime) || issuanceTime > Date.now()) {
    return { outcome: "INVALID", credentialId: record.credentialId, message: "Credential issuance date is invalid or in the future.", checkedAt };
  }

  if (vcToCheck.validUntil && !Number.isFinite(Date.parse(vcToCheck.validUntil))) {
    return { outcome: "INVALID", credentialId: record.credentialId, message: "Credential expiration date is invalid.", checkedAt };
  }

  if (record.status === "REVOKED") {
    return { outcome: "REVOKED", credentialId: record.credentialId, message: `This credential was revoked${record.revokedAt ? ` on ${new Date(record.revokedAt).toLocaleDateString()}` : ""}.`, checkedAt, credential: record };
  }

  if (record.status === "SUPERSEDED") {
    return { outcome: "SUPERSEDED", credentialId: record.credentialId, message: `This credential has been superseded by a corrected version${record.supersededBy ? ` (${record.supersededBy})` : ""}.`, checkedAt, supersededBy: record.supersededBy, credential: record };
  }

  if (record.validUntil && new Date(record.validUntil).getTime() < Date.now()) {
    return { outcome: "EXPIRED", credentialId: record.credentialId, message: `This credential expired on ${new Date(record.validUntil).toLocaleDateString()}.`, checkedAt, credential: record };
  }

  return { outcome: "VERIFIED", credentialId: record.credentialId, message: "Signature, issuer, and validity period are authentic.", checkedAt, credential: record };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
