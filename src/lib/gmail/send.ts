import nodemailer, { type Transporter } from "nodemailer";

export const gmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
export type SendEmailResult = { ok: true; messageId: string } | { ok: false; reason: "EMAIL_NOT_CONFIGURED" | "EMAIL_SEND_FAILED" };
let transporter: Transporter | null = null;

function getTransporter() {
  if (!gmailConfigured) return null;
  return (transporter ??= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }));
}

export async function sendGmailNotification(to: string, subject: string, text: string): Promise<SendEmailResult> {
  const mailer = getTransporter();
  if (!mailer) return { ok: false, reason: "EMAIL_NOT_CONFIGURED" };
  try {
    const result = await mailer.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
    return { ok: true, messageId: result.messageId };
  } catch {
    return { ok: false, reason: "EMAIL_SEND_FAILED" };
  }
}

export const emailTemplates = {
  studentApproved: (name: string) => ({ subject: "VIGYAN.ID — Identity Verified", text: `Hi ${name},\n\nYour university verification is complete. Your VIGYAN.ID identity is now active and eligible for credential services.\n\n— VIGYAN.ID` }),
  studentRejected: (name: string, reason?: string) => ({ subject: "VIGYAN.ID — Verification Update", text: `Hi ${name},\n\nYour university verification was not approved.${reason ? `\n\nReason: ${reason}` : ""}\n\n— VIGYAN.ID` }),
  credentialIssued: (name: string, title: string, id: string, url: string) => ({ subject: "VIGYAN.ID — Credential Issued", text: `Hi ${name},\n\nCredential: ${title}\nCredential ID: ${id}\nVerify: ${url}\n\n— VIGYAN.ID` }),
  correctionSubmitted: (name: string, id: string, field: string, url: string) => ({ subject: `Correction request submitted for ${id}`, text: `${name} submitted a correction for ${id} (field: ${field}).\n\nReview: ${url}\n\n— VIGYAN.ID` }),
  correctionApproved: (name: string, oldId: string, newId: string, url: string) => ({ subject: "Your credential correction has been approved", text: `Hi ${name},\n\nPrevious credential: ${oldId}\nNew credential: ${newId}\nVerify: ${url}\n\n— VIGYAN.ID` }),
  correctionRejected: (name: string, id: string, reason?: string) => ({ subject: "Your credential correction request was rejected", text: `Hi ${name},\n\nYour correction for ${id} was rejected.${reason ? `\n\nReason: ${reason}` : ""}\n\n— VIGYAN.ID` }),
  credentialRevoked: (name: string, id: string, url: string) => ({ subject: "A VIGYAN.ID credential has been revoked", text: `Hi ${name},\n\nCredential ${id} was revoked.\n\nCheck status: ${url}\n\n— VIGYAN.ID` }),
};
