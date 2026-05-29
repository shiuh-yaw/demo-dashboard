import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "./providers";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Flow — Accept any crypto. Settle any stablecoin.",
  description:
    "An interactive demo of Dynamic's Flow product. Accept crypto deposits from any wallet, exchange, or embedded wallet — settle in any stablecoin at a Fireblocks vault, embedded wallet, or external address.",
};

/**
 * Zero-chrome layout. No nav, no theme toggle, no footer. The page IS
 * the widget — matches the apps/checkouts pattern. Per-scenario branding
 * (primary color, brand) projects via `<ThemeStyleTag>` inside each
 * scenario page's `<ScenarioThemeWrapper>`.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <body className={`${dmSans.className} bg-(--brand-page-bg)`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
