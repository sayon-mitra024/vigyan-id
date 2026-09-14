"use client";

import { useAuth } from "@/components/auth-provider";
import { StudentPortal } from "@/components/student/student-portal";
import { IssuerPortal } from "@/components/issuer/issuer-portal";
import VLoader from "@/components/ui/VLoader";
import { LandingPage } from "@/components/landing-page";

export default function Home() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F6]"><VLoader label="Loading VIGYAN.ID" /></div>
    );
  }

  if (!session) return <LandingPage />;
  if (session.role === "STUDENT") return <StudentPortal />;
  return <IssuerPortal />;
}
