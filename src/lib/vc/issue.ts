import { bytesToBase64Url, signBytes } from "@/lib/crypto/ed25519";
import { canonicalBytes } from "./canonicalize";
import type { VerifiableCredential, VcProof } from "./types";

export type UnsignedCredentialInput = {
  credentialId: string;
  issuerDid: string;
  holderDid: string;
  holderName: string;
  credentialType: string;
  title: string;
  institution: string;
  issuanceDate: string;
  validUntil?: string;
  extraSubjectFields?: Record<string, unknown>;
};

/** Builds the unsigned W3C-shaped VC document (no `proof` yet). */
export function buildUnsignedCredential(input: UnsignedCredentialInput): VerifiableCredential {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", "https://vigyan.id/contexts/academic-credential/v1"],
    id: `urn:vigyanid:credential:${input.credentialId}`,
    type: ["VerifiableCredential", "AcademicCredential", input.credentialType],
    issuer: input.issuerDid,
    issuanceDate: input.issuanceDate,
    ...(input.validUntil ? { validUntil: input.validUntil } : {}),
    credentialSubject: {
      id: input.holderDid,
      holderName: input.holderName,
      credentialType: input.credentialType,
      title: input.title,
      institution: input.institution,
      ...(input.extraSubjectFields ?? {}),
    },
  };
}

/**
 * Signs the canonicalized unsigned credential with the issuer's Ed25519 private key
 * and attaches a real `proof` object. The private key must never be persisted; it is
 * only held in memory for the duration of the signing operation.
 */
export function signCredential(unsigned: VerifiableCredential, issuerPrivateKey: Uint8Array, verificationMethod: string): VerifiableCredential {
  const created = new Date().toISOString();
  const message = canonicalBytes(unsigned);
  const signature = signBytes(message, issuerPrivateKey);
  const proof: VcProof = { type: "Ed25519Signature2020", created, verificationMethod, proofPurpose: "assertionMethod", proofValue: `z${bytesToBase64Url(signature)}` };
  return { ...unsigned, proof };
}
