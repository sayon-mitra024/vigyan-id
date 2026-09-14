import { adminDb } from "@/lib/firebase/admin";
import type { CorrectionRequestRecord, CredentialRecord } from "@/lib/vc/types";
import type { DataStore, UserRecord } from "./types";

/** Real Firestore-backed implementation of the DataStore boundary. Server-only. */
export const firestoreStore: DataStore = {
  mode: "firestore",

  async getUser(uid) {
    const snap = await adminDb().collection("users").doc(uid).get();
    return snap.exists ? (snap.data() as UserRecord) : null;
  },
  async upsertUser(user) {
    await adminDb().collection("users").doc(user.uid).set(user, { merge: true });
  },
  async listStudents() {
    const snap = await adminDb().collection("users").where("role", "==", "STUDENT").get();
    return snap.docs.map((d) => d.data() as UserRecord);
  },
  async findStudentByInstitutionId(institutionId, studentId) {
    const snap = await adminDb().collection("users").where("role", "==", "STUDENT").where("institutionId", "==", institutionId).where("studentId", "==", studentId).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as UserRecord);
  },

  async getCredential(credentialId) {
    const snap = await adminDb().collection("credentials").doc(credentialId).get();
    return snap.exists ? (snap.data() as CredentialRecord) : null;
  },
  async listCredentialsForHolder(holderUid) {
    const snap = await adminDb().collection("credentials").where("holderUid", "==", holderUid).get();
    return snap.docs.map((d) => d.data() as CredentialRecord);
  },
  async listAllCredentials() {
    const snap = await adminDb().collection("credentials").get();
    return snap.docs.map((d) => d.data() as CredentialRecord);
  },
  async createCredential(record) {
    await adminDb().collection("credentials").doc(record.credentialId).set(record);
    await adminDb().collection("credentialVersions").doc(`${record.credentialId}-v${record.version}`).set(record);
  },
  async updateCredential(credentialId, patch) {
    await adminDb().collection("credentials").doc(credentialId).set(patch, { merge: true });
  },

  async createCorrection(record) {
    await adminDb().collection("correctionRequests").doc(record.id).set(record);
  },
  async getCorrection(id) {
    const snap = await adminDb().collection("correctionRequests").doc(id).get();
    return snap.exists ? (snap.data() as CorrectionRequestRecord) : null;
  },
  async listCorrectionsForStudent(studentUid) {
    const snap = await adminDb().collection("correctionRequests").where("studentUid", "==", studentUid).get();
    return snap.docs.map((d) => d.data() as CorrectionRequestRecord);
  },
  async listAllCorrections() {
    const snap = await adminDb().collection("correctionRequests").get();
    return snap.docs.map((d) => d.data() as CorrectionRequestRecord);
  },
  async updateCorrection(id, patch) {
    await adminDb().collection("correctionRequests").doc(id).set(patch, { merge: true });
  },

  async logVerification(entry) {
    await adminDb().collection("verificationLogs").add(entry);
  },
  async logAudit(entry) {
    await adminDb().collection("auditLogs").add(entry);
  },
};
