export type CredentialLifecycleStatus = "ISSUED" | "ACTIVE" | "REVOKED" | "SUPERSEDED" | "EXPIRED";

/** W3C Verifiable Credentials Data Model 2.0 proof object (Ed25519Signature2020-style, JCS canonicalization). */
export type VcProof = {
  type: "Ed25519Signature2020";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  proofValue: string;
};

/** W3C Verifiable Credential envelope. `proof` is added after signing; the unsigned document is signed as-is. */
export type VerifiableCredential = {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  validUntil?: string;
  credentialSubject: {
    id: string;
    holderName: string;
    credentialType: string;
    title: string;
    institution: string;
    [key: string]: unknown;
  };
  proof?: VcProof;
};

/** Internal application record wrapping a VC with lifecycle and versioning metadata. */
export type CredentialRecord = {
  credentialId: string;
  holderUid: string;
  holderDid: string;
  issuerDid: string;
  institutionId: string;
  credentialType: string;
  status: CredentialLifecycleStatus;
  version: number;
  previousVersion?: string;
  supersededBy?: string;
  vc: VerifiableCredential;
  issuedAt: string;
  validUntil?: string;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CorrectionRequestRecord = {
  id: string;
  credentialId: string;
  studentUid: string;
  field: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
  supportingDocumentPath?: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  newCredentialId?: string;
  createdAt: string;
};

export type VerificationOutcome =
  | "VERIFIED"
  | "INVALID"
  | "TAMPERED"
  | "UNTRUSTED_ISSUER"
  | "REVOKED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "NOT_FOUND";

export type VerificationResult = {
  outcome: VerificationOutcome;
  credentialId?: string;
  message: string;
  checkedAt: string;
  supersededBy?: string;
  credential?: CredentialRecord;
};
