import { NextResponse } from "next/server";
import { canAccessInstitution, getSessionUser } from "@/lib/auth/session";
import { store } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { id } = await params;
  const credential = await store.getCredential(id);
  if (!credential) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const canAccess = credential.holderUid === user.uid || ((user.role === "ISSUER" || user.role === "ADMIN") && canAccessInstitution(user, credential.institutionId));
  if (!canAccess) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  return NextResponse.json({ credential });
}
