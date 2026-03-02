import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";

import Providers from "@/lib/providers";

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
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased bg-(--widget-page-bg)`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
