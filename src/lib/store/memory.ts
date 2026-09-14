import { getInstitutionIssuerKey } from "@/lib/crypto/issuerKey";
import { didFromPublicKey, generateEd25519KeyPair } from "@/lib/crypto/ed25519";
import { buildUnsignedCredential, signCredential } from "@/lib/vc/issue";
import type { CorrectionRequestRecord, CredentialRecord } from "@/lib/vc/types";
import type { DataStore, UserRecord } from "./types";

/**
 * DEMO-ONLY in-memory data store. Used exclusively when Firebase Admin is not configured,
 * so the app remains runnable and demonstrable without a Firebase project. Data lives only
 * for the lifetime of the server process and resets on restart. Never used when
 * `firebaseAdminConfigured` is true.
 */

// Pinned to `globalThis` (not just a module-level variable) because Next.js dev
// bundling can give different route handlers separate instances of the same module
// graph; a plain module-level Map would silently reset between routes.
type DemoState = {
  users: Map<string, UserRecord>;
  credentials: Map<string, CredentialRecord>;
  corrections: Map<string, CorrectionRequestRecord>;
  verificationLogs: { credentialId?: string; outcome: string; checkedAt: string }[];
  auditLogs: { action: string; actorUid?: string; actorRole?: string; institutionId?: string; targetId?: string; occurredAt: string }[];
};
const globalKey = "__vigyanIdDemoStore__";
const globalStore = globalThis as unknown as { [globalKey]?: DemoState };
const state: DemoState = globalStore[globalKey] ?? {
  users: new Map<string, UserRecord>(),
  credentials: new Map<string, CredentialRecord>(),
  corrections: new Map<string, CorrectionRequestRecord>(),
  verificationLogs: [],
  auditLogs: [],
};
globalStore[globalKey] = state;
const { users, credentials, corrections, verificationLogs, auditLogs } = state;

function seed() {
  if (users.size > 0) return;
  const issuer = getInstitutionIssuerKey();
  const studentKeys = generateEd25519KeyPair();

  const student: UserRecord = {
    uid: "demo-student-aarav",
    name: "Aarav Sharma",
    email: "aarav.sharma@demo.vigyan.id",
    role: "STUDENT",
    did: studentKeys.did,
    publicKeyMultibase: studentKeys.publicKeyMultibase,
    institutionId: "chandigarh-university",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const issuerUser: UserRecord = {
    uid: "demo-issuer-registrar",
    name: "University Registrar",
    email: "registrar@demo.vigyan.id",
    role: "ISSUER",
    did: issuer.did,
    publicKeyMultibase: didFromPublicKey(issuer.publicKey).slice("did:key:".length),
    institutionId: "chandigarh-university",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.set(student.uid, student);
  users.set(issuerUser.uid, issuerUser);

  const issuedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const unsigned = buildUnsignedCredential({
    credentialId: "VC-2026-00124",
    issuerDid: issuer.did,
    holderDid: student.did,
    holderName: student.name,
    credentialType: "BachelorDegree",
    title: "Bachelor of Technology, Computer Science",
    institution: "Chandigarh University",
    issuanceDate: issuedAt,
    validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 4).toISOString(),
  });
  const signed = signCredential(unsigned, issuer.privateKey, `${issuer.did}#key-1`);
  const record: CredentialRecord = {
    credentialId: "VC-2026-00124",
    holderUid: student.uid,
    holderDid: student.did,
    issuerDid: issuer.did,
    institutionId: "chandigarh-university",
    credentialType: "BachelorDegree",
    status: "ACTIVE",
    version: 1,
    vc: signed,
    issuedAt,
    validUntil: unsigned.validUntil,
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
  credentials.set(record.credentialId, record);

  corrections.set("CR-00042", {
    id: "CR-00042",
    credentialId: "VC-2026-00124",
    studentUid: student.uid,
    field: "Date of Birth",
    currentValue: "12 Aug 2003",
    requestedValue: "21 Aug 2003",
    reason: "The original student record has a typographical error.",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  });
}

export const memoryStore: DataStore = {
  mode: "demo",

  async getUser(uid) {
    seed();
    return users.get(uid) ?? null;
  },
  async upsertUser(user) {
    seed();
    users.set(user.uid, user);
  },
  async listStudents() {
    seed();
    return [...users.values()].filter((u) => u.role === "STUDENT");
  },
  async findStudentByInstitutionId(institutionId, studentId) {
    seed();
    return [...users.values()].find((u) => u.role === "STUDENT" && u.institutionId === institutionId && u.studentId === studentId) ?? null;
  },

  async getCredential(credentialId) {
    seed();
    return credentials.get(credentialId) ?? null;
  },
  async listCredentialsForHolder(holderUid) {
    seed();
    return [...credentials.values()].filter((c) => c.holderUid === holderUid);
  },
  async listAllCredentials() {
    seed();
    return [...credentials.values()];
  },
  async createCredential(record) {
    seed();
    credentials.set(record.credentialId, record);
  },
  async updateCredential(credentialId, patch) {
    seed();
    const existing = credentials.get(credentialId);
    if (existing) credentials.set(credentialId, { ...existing, ...patch });
  },

  async createCorrection(record) {
    seed();
    corrections.set(record.id, record);
  },
  async getCorrection(id) {
    seed();
    return corrections.get(id) ?? null;
  },
  async listCorrectionsForStudent(studentUid) {
    seed();
    return [...corrections.values()].filter((c) => c.studentUid === studentUid);
  },
  async listAllCorrections() {
    seed();
    return [...corrections.values()];
  },
  async updateCorrection(id, patch) {
    seed();
    const existing = corrections.get(id);
    if (existing) corrections.set(id, { ...existing, ...patch });
  },

  async logVerification(entry) {
    verificationLogs.push(entry);
  },
  async logAudit(entry) {
    auditLogs.push(entry);
  },
};
