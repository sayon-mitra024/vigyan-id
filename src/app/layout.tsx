import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = { title: "VIGYAN.ID — Issue. Own. Share. Verify.", description: "A sovereign academic identity and verifiable credential wallet for Chandigarh University." };
export const viewport: Viewport = { themeColor: "#f7f8fa", width: "device-width", initialScale: 1, userScalable: false };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
