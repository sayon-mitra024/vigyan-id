import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True only when every required NEXT_PUBLIC_FIREBASE_* env var is present. */
export const firebaseClientConfigured = Object.values(config).every(Boolean);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

if (firebaseClientConfigured) {
  app = getApps().length ? getApp() : initializeApp(config);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

function notConfigured(): never {
  throw new Error("FIREBASE_CLIENT_NOT_CONFIGURED");
}

// Proxies throw only when actually used, so importing this module never crashes the
// app before Firebase is configured (demo mode keeps working).
export const auth = authInstance ?? (new Proxy({}, { get: notConfigured }) as Auth);
export const db = dbInstance ?? (new Proxy({}, { get: notConfigured }) as Firestore);
export const storage = storageInstance ?? (new Proxy({}, { get: notConfigured }) as FirebaseStorage);
