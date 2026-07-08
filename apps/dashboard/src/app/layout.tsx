import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";

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
  title: "Dynamic Demos",
  description:
    "Live demo apps showcasing wallets, checkouts, and payments built on Dynamic.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root Layout
 *
 * Fonts + global styles only. Auth, providers, and chrome live in the
 * route-group layouts: (operator) for the gated dashboard, (public) for
 * the landing pages.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
