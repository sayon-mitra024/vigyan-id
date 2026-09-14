"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, firebaseClientConfigured } from "@/lib/firebase/client";
import type { UserRecord } from "@/lib/store/types";

export type SessionInfo = { uid: string; role: UserRecord["role"]; profile: UserRecord; mode: "firestore" | "demo" } | null;

type AuthContextValue = {
  session: SessionInfo;
  loading: boolean;
  firebaseConfigured: boolean;
  refresh: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUpStudent: (name: string, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loginDemo: (demoUid: "demo-student-aarav" | "demo-issuer-registrar") => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch("/api/auth/session");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSession(await fetchSession());
  }, []);

  useEffect(() => {
    if (!firebaseClientConfigured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time demo-mode session bootstrap on mount
      refresh().finally(() => setLoading(false));
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async () => {
      await refresh();
      setLoading(false);
    });
    return unsubscribe;
  }, [refresh]);

  const loginWithEmailPassword: AuthContextValue["loginWithEmailPassword"] = useCallback(
    async (email, password) => {
      if (!firebaseClientConfigured) return { ok: false, error: "Firebase is not configured for this deployment." };
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
        if (!res.ok) {
          await signOut(auth).catch(() => undefined);
          return { ok: false, error: (await res.json().catch(() => ({}))).error ?? "Sign-in failed." };
        }
        await refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Sign-in failed." };
      }
    },
    [refresh],
  );

  const signUpStudent: AuthContextValue["signUpStudent"] = useCallback(
    async (name, email, password) => {
      if (!firebaseClientConfigured) return { ok: false, error: "Firebase is not configured for this deployment." };
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, name }) });
        if (!res.ok) {
          await signOut(auth).catch(() => undefined);
          return { ok: false, error: (await res.json().catch(() => ({}))).error ?? "Your Firebase account was created, but the profile could not be completed. Please sign in again or contact an administrator." };
        }
        await refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Sign-up failed." };
      }
    },
    [refresh],
  );

  const loginDemo: AuthContextValue["loginDemo"] = useCallback(
    async (demoUid) => {
      const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoUid }) });
      if (!res.ok) return { ok: false, error: (await res.json().catch(() => ({}))).error ?? "Demo sign-in failed." };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    if (firebaseClientConfigured) await signOut(auth).catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" });
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, firebaseConfigured: firebaseClientConfigured, refresh, loginWithEmailPassword, signUpStudent, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
