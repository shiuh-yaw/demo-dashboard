import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";

import Providers from "@/lib/providers";
import { getCurrentUser, isDashboardAuthenticated } from "@/lib/auth/session";
import DashboardLoginForm from "./components/login-form";
import { Sidebar } from "./components/sidebar";

import "@/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Payment Widget",
  description: "Accept crypto payments with Dynamic SDK",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root Layout
 *
 * Wraps the entire application with:
 * - Global styles and fonts
 * - Providers (Dynamic SDK, Theme, Wallet Book)
 * - Dashboard authentication and sidebar
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  const isAuthenticated = await isDashboardAuthenticated();
  const user = isAuthenticated ? await getCurrentUser() : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Providers>
          {!isAuthenticated ? (
            <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
              <DashboardLoginForm />
            </div>
          ) : (
            <div className="min-h-screen bg-[#f8fafc] flex">
              <Sidebar
                user={user ? { sub: user.sub, email: user.email } : null}
              />
              <main className="flex-1 ml-16 transition-all duration-200">
                <div className="max-w-5xl mx-auto p-8">{children}</div>
              </main>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
