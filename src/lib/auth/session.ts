import { cookies } from "next/headers";
import { adminAuth, firebaseAdminConfigured, firebaseConfigurationPresent } from "@/lib/firebase/admin";
import { store } from "@/lib/store";
import type { UserRecord } from "@/lib/store/types";
import { DEMO_SESSION_COOKIE, verifyDemoSession } from "./demo";

export const FIREBASE_SESSION_COOKIE = "vigyanid_session";

export type SessionUser = { uid: string; role: UserRecord["role"]; profile: UserRecord; mode: "firestore" | "demo" };

/**
 * Resolves the authenticated user from an HttpOnly session cookie. Never trusts a
 * role supplied by the client request body — the role always comes from the server-side
 * Firestore/demo user record keyed by the verified uid.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();

  if (firebaseAdminConfigured) {
    const sessionCookie = jar.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;
    try {
      const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
      const profile = await store.getUser(decoded.uid);
      if (!profile || profile.status === "DISABLED") return null;
      return { uid: decoded.uid, role: profile.role, profile, mode: "firestore" };
    } catch {
      return null;
    }
  }

  if (firebaseConfigurationPresent) return null;

  const demoCookie = jar.get(DEMO_SESSION_COOKIE)?.value;
  if (!demoCookie) return null;
  const demoSession = await verifyDemoSession(demoCookie);
  if (!demoSession) return null;
  const profile = await store.getUser(demoSession.uid);
  if (!profile || profile.status === "DISABLED") return null;
  return { uid: demoSession.uid, role: profile.role, profile, mode: "demo" };
}

export async function requireRole(...roles: UserRecord["role"][]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new SessionError("UNAUTHENTICATED", 401);
  if (!roles.includes(user.role)) throw new SessionError("FORBIDDEN", 403);
  return user;
}

export function canAccessInstitution(user: SessionUser, institutionId: string): boolean {
  return user.role === "ADMIN" || user.profile.institutionId === institutionId;
}

export class SessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
