import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RoleProvider } from "@/contexts/RoleContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: { default: "파슉슉버디탁", template: "%s | 파슉슉버디탁" },
  description: "사내 골프동호회 통합 관리 시스템",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B4619",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <RoleProvider>
          <AppShell>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col md:ml-60 min-h-screen">
                <MobileHeader />
                <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
              </div>
              <MobileNav />
            </div>
          </AppShell>
        </RoleProvider>
      </body>
    </html>
  );
}
