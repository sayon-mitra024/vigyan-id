import type { CredentialRecord } from "@/lib/vc/types";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { CertificateCanvas } from "./credential-certificate";

/** Flattens a CredentialRecord into the display fields the Stitch UI expects. */
export function toDisplayCredential(record: CredentialRecord) {
  return {
    credentialId: record.credentialId,
    credentialType: record.credentialType,
    title: (record.vc.credentialSubject.title as string) ?? record.credentialType,
    issuer: (record.vc.credentialSubject.institution as string) ?? "Unknown institution",
    issuerLogoUrl: record.vc.credentialSubject.institutionLogoUrl as string | undefined,
    issuerDid: record.issuerDid,
    holder: record.vc.credentialSubject.holderName,
    holderDid: record.holderDid,
    issuedAt: new Date(record.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
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

/**
 * Generates a properly laid-out, printable PDF certificate directly from the
 * real signed credential — no placeholder content, every field is live data.
 */
export async function downloadCertificate(record: CredentialRecord, verifyUrl: string) {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 320, color: { dark: "#172033", light: "#ffffff" } });
  const host = document.createElement("div");
  Object.assign(host.style, { position: "fixed", left: "-12000px", top: "0", width: "1140px", height: "807px", overflow: "hidden" });
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(createElement(CertificateCanvas, { record, qrDataUrl }));
  try {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, { scale: 2, useCORS: true, backgroundColor: "#fcfcfb" });
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [1140, 807] });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 1140, 807);
    doc.save(`${record.credentialId}-certificate.pdf`);
  } finally { root.unmount(); host.remove(); }
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
