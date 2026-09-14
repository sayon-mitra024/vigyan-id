import type { CredentialRecord } from "@/lib/vc/types";

/** Flattens a CredentialRecord into the display fields the Stitch UI expects. */
export function toDisplayCredential(record: CredentialRecord) {
  return {
    credentialId: record.credentialId,
    credentialType: record.credentialType,
    title: (record.vc.credentialSubject.title as string) ?? record.credentialType,
    issuer: (record.vc.credentialSubject.institution as string) ?? "Unknown institution",
    issuerDid: record.issuerDid,
    holder: record.vc.credentialSubject.holderName,
    holderDid: record.holderDid,
    issuedAt: new Date(record.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    validUntil: record.validUntil ? new Date(record.validUntil).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "No expiry",
    status: record.status,
    version: record.version,
    previousVersion: record.previousVersion,
    supersededBy: record.supersededBy,
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename);
}

/** Generates a plain-text certificate representation directly from the real signed credential. */
export function downloadCertificate(record: CredentialRecord, verifyUrl: string) {
  const display = toDisplayCredential(record);
  const lines = [
    "VIGYAN ID — VERIFIABLE ACADEMIC CREDENTIAL",
    "============================================",
    "",
    `Credential ID:     ${display.credentialId}`,
    `Version:           v${display.version}${display.previousVersion ? ` (supersedes ${display.previousVersion})` : ""}`,
    `Status:            ${display.status}`,
    `Title:              ${display.title}`,
    `Holder:             ${display.holder}`,
    `Holder DID:         ${display.holderDid}`,
    `Issuer:             ${display.issuer}`,
    `Issuer DID:         ${display.issuerDid}`,
    `Issued on:          ${display.issuedAt}`,
    `Valid until:        ${display.validUntil}`,
    "",
    `Proof type:         ${record.vc.proof?.type ?? "unsigned"}`,
    `Proof created:      ${record.vc.proof?.created ?? "-"}`,
    `Verification method: ${record.vc.proof?.verificationMethod ?? "-"}`,
    "",
    `Verify this credential: ${verifyUrl}`,
    "",
    "This certificate is a human-readable rendering of a cryptographically signed",
    "W3C Verifiable Credential. Anyone can independently verify its authenticity",
    "at the URL above using the credential ID.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  triggerDownload(blob, `${display.credentialId}-certificate.txt`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
