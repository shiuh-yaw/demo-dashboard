import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  DEFAULT_WIDGET_CONFIG,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";
import { Providers } from "./providers";
import { NetworkBar } from "./network-bar";
import { DepositConfigProvider } from "@/contexts/deposit-config-context";
import { IdentityBridge } from "@/components/analytics/identity-bridge";

import "./globals.css";

export const metadata: Metadata = {
  title: "Deposit Demo — Dynamic + Fireblocks",
  description: "Deposit funds via Fireblocks vault with AML screening",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-deposit-config-id");
  // Deposit shares wallet's storage kind (its records live under
  // `kind: "wallet"` in DemoConfig); the middleware-level `demoType` is
  // distinct from the storage `kind`. Apps know the mapping; the
  // endpoint validates the `kind` it receives.
  const config = await fetchDemoConfig({
    demoType: "wallet",
    id: configId,
    fallback: DEFAULT_WIDGET_CONFIG,
  });

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens deposit personalizes per brand. Everything else falls through to
  // deposit's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = widgetThemeToBrandTheme(config.theme);

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        {/* NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this is safe to
            mount unconditionally (packages/analytics Phase 02 guarantee). */}
        <GtmTracker demoSlug="deposit">
          <IdentityBridge />
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-[400px]">
              <Providers>
                <DepositConfigProvider config={config}>
                  <NetworkBar />
                  {children}
                </DepositConfigProvider>
              </Providers>
            </div>
          </div>
        </GtmTracker>
      </body>
    </html>
  );
}
