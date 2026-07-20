import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
  type WidgetConfig,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { WalletConfigProvider } from "@/contexts/wallet-config-context";

import "./globals.css";

// React.cache dedupes the dashboard fetch across generateMetadata and
// RootLayout within one request (fetchDemoConfig itself is no-store).
// Empty fallback (remittance's pattern): the default render emits NO
// theme overrides, so wallet's default chrome IS the canonical D-030
// palette from @dynamic-demos/theme/defaults.css. DEFAULT_WIDGET_CONFIG
// is deliberately not used here — its baked charcoal theme predates
// D-030 and would re-inject the old look.
const getWalletConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-wallet-config-id");
  const config = await fetchDemoConfig<WidgetConfig>({
    demoType: "wallet",
    id: configId,
    fallback: {},
  });
  return { configId, config };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getWalletConfig();
  return buildDemoMetadata({
    demoName: "Wallet",
    appName: config.branding?.name,
    description:
      "Non-custodial MPC wallets your users control - sign in with email, social, or passkeys and get a wallet in seconds, no seed phrase. Built on Dynamic.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const { config } = await getWalletConfig();

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens a branded config personalizes. Everything else falls through to
  // the canonical defaults in @dynamic-demos/theme/defaults.css. Zero FOUC,
  // zero hydration mismatch — the inline <style> beats client paint.
  //
  // `?scope=` (sticky, like `?theme=`) picks how much of the page the
  // brand owns: "page" (default — full immersion, overrides on :root)
  // or "widget" (overrides confined to .brand-scope, the live widget;
  // hero/panel/site chrome keep the canonical Dynamic look).
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});
  const themeScope =
    headersList.get("x-wallet-theme-scope") === "widget" ? "widget" : "page";

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag
          theme={brandTheme}
          overridesOnly
          selector={themeScope === "widget" ? ".brand-scope" : ":root"}
        />
      </head>
      <body>
        <Providers>
          <WalletConfigProvider config={config}>
            {children}
          </WalletConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
