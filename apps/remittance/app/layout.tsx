import type { Metadata } from "next";
import { headers } from "next/headers";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { RemittanceConfigProvider } from "@/contexts/remittance-config-context";
import {
  type RemittanceConfig,
  themeToBrandTheme,
} from "@/lib/remittance-config";

import "./globals.css";

export const metadata: Metadata = {
  title: "Remittance Demo — Dynamic + Fireblocks",
  description:
    "Send money globally with embedded wallets, gas-sponsored USDC transfers on Base Sepolia, and Fireblocks custody",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-remittance-config-id");
  const config = await fetchDemoConfig<RemittanceConfig>({
    demoType: "remittance",
    id: configId,
    fallback: {},
  });

  // SSR theme injection (D-008): project the stored `WidgetTheme` onto a
  // `Partial<BrandTheme>` overlay and emit per-brand `--brand-*` overrides
  // in <head>. Unspecified fields fall through to
  // @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration mismatch.
  const brandTheme = themeToBrandTheme(config.theme ?? {});

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        <Providers>
          <RemittanceConfigProvider config={config}>
            {children}
          </RemittanceConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
