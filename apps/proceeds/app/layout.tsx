import type { Metadata } from "next";
import { GtmTracker } from "@dynamic-demos/analytics";
import { Providers } from "./providers";
import { IdentityBridge } from "@/components/analytics/identity-bridge";

import "./globals.css";

export const metadata: Metadata = {
  title: "Proceeds — Developer Payouts",
  description:
    "Developer payout platform with stablecoin wallets, powered by Fireblocks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* GTM: NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this is safe
            to mount unconditionally (@dynamic-demos/analytics guarantee). */}
        <GtmTracker demoSlug="proceeds">
          <Providers>
            <IdentityBridge />
            {children}
          </Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
