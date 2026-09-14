import type { CorrectionRequestRecord, CredentialRecord } from "@/lib/vc/types";
import type { UserRole } from "@/types/domain";

export type UserRecord = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  did: string;
  publicKeyMultibase: string;
  institutionId: string;
  status?: "PENDING_VERIFICATION" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "DISABLED";
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  studentId?: string;
  program?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Application data-access boundary. Firestore is the real, primary implementation;
 * the in-memory implementation exists only so the app is runnable and demonstrable
 * before a Firebase project is connected, and it is clearly labeled as demo data.
 */
export interface DataStore {
  readonly mode: "firestore" | "demo";
  getUser(uid: string): Promise<UserRecord | null>;
  upsertUser(user: UserRecord): Promise<void>;
  listStudents(): Promise<UserRecord[]>;
  findStudentByInstitutionId(institutionId: string, studentId: string): Promise<UserRecord | null>;
  logAudit(entry: { action: string; actorUid?: string; actorRole?: UserRole; institutionId?: string; targetId?: string; occurredAt: string }): Promise<void>;

  getCredential(credentialId: string): Promise<CredentialRecord | null>;
  listCredentialsForHolder(holderUid: string): Promise<CredentialRecord[]>;
  listAllCredentials(): Promise<CredentialRecord[]>;
  createCredential(record: CredentialRecord): Promise<void>;
  updateCredential(credentialId: string, patch: Partial<CredentialRecord>): Promise<void>;

  createCorrection(record: CorrectionRequestRecord): Promise<void>;
  getCorrection(id: string): Promise<CorrectionRequestRecord | null>;
  listCorrectionsForStudent(studentUid: string): Promise<CorrectionRequestRecord[]>;
  listAllCorrections(): Promise<CorrectionRequestRecord[]>;
  updateCorrection(id: string, patch: Partial<CorrectionRequestRecord>): Promise<void>;

  logVerification(entry: { credentialId?: string; outcome: string; checkedAt: string }): Promise<void>;
}
