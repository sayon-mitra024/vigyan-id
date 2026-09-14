import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/types/domain";

/**
 * DEMO-ONLY session signing. Used solely when Firebase Admin is not configured, so the
 * app is explorable without a Firebase project. Never used in production (guarded by
 * `firebaseAdminConfigured` at the call sites in lib/auth/session.ts).
 */
const DEMO_SECRET = new TextEncoder().encode(process.env.DEMO_SESSION_SECRET ?? "vigyan-id-demo-session-secret-not-for-production");

export const DEMO_SESSION_COOKIE = "vigyanid_demo_session";

export type DemoSessionPayload = { uid: string; role: UserRole };

export async function signDemoSession(payload: DemoSessionPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(DEMO_SECRET);
}

export async function verifyDemoSession(token: string): Promise<DemoSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, DEMO_SECRET);
    if (typeof payload.uid === "string" && typeof payload.role === "string") {
      return { uid: payload.uid, role: payload.role as UserRole };
    }
    return null;
  } catch {
    return null;
  }
}
