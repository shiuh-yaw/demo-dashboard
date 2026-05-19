import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  DEFAULT_WIDGET_CONFIG,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { WalletConfigProvider } from "@/contexts/wallet-config-context";

import "./globals.css";

export const metadata: Metadata = {
  title: "Dynamic JS SDK Wallet Demo",
  description:
    "Demo app showcasing Dynamic JavaScript SDK with email/Google auth and embedded wallets",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-wallet-config-id");
  const config = await fetchDemoConfig({
    demoType: "wallet",
    id: configId,
    fallback: DEFAULT_WIDGET_CONFIG,
  });

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens wallet personalizes per brand. Everything else falls through to
  // wallet's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = widgetThemeToBrandTheme(config.theme);

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
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
