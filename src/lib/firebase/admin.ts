import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK. Never import this from a "use client" component.
 * Guarded so the app can boot without Firebase configured (demo mode) and only
 * throws when server code actually attempts a Firestore/Auth operation.
 */
const clientConfigKeys = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
];
const adminConfigKeys = [process.env.FIREBASE_PROJECT_ID, process.env.FIREBASE_CLIENT_EMAIL, process.env.FIREBASE_PRIVATE_KEY];

export const firebaseClientConfigured = clientConfigKeys.every(Boolean);
export const firebaseAdminConfigured = adminConfigKeys.every(Boolean);
export const firebaseConfigurationPresent = clientConfigKeys.some(Boolean) || adminConfigKeys.some(Boolean);

let adminApp: App | null = null;

function getAdminApp(): App {
  if (!firebaseAdminConfigured) throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  if (adminApp) return adminApp;
  adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  return adminApp;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}
