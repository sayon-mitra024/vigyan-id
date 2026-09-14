export type UserRole = "STUDENT" | "ISSUER" | "ADMIN";
export type CredentialStatus = "ISSUED" | "ACTIVE" | "REVOKED" | "SUPERSEDED" | "EXPIRED";
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Credential = { credentialId: string; credentialType: string; title: string; issuer: string; issuerDid: string; holder: string; holderUid?: string; issuedAt: string; validUntil: string; status: CredentialStatus; version: number; previousVersion?: string; supersededBy?: string; proof?: { type: string; created: string; verificationMethod: string; proofValue: string } };
export type CorrectionRequest = { id: string; credentialId: string; field: string; currentValue: string; requestedValue: string; reason: string; status: CorrectionStatus; createdAt: string };
