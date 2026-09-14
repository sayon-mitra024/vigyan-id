import { firebaseAdminConfigured } from "@/lib/firebase/admin";
import { firestoreStore } from "./firestore";
import { memoryStore } from "./memory";
import type { DataStore } from "./types";

/** Selects the real Firestore store when Firebase Admin is configured, demo store otherwise. */
export const store: DataStore = firebaseAdminConfigured ? firestoreStore : memoryStore;

export type { DataStore, UserRecord } from "./types";
