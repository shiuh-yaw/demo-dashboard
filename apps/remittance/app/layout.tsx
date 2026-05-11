import type { Metadata } from "next";
import { headers } from "next/headers";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { RemittanceConfigProvider } from "@/contexts/remittance-config-context";
import { getRemittanceConfig } from "@/lib/api/remittance-config";
import { themeToBrandTheme } from "@/lib/remittance-config";

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
  const config = configId ? await getRemittanceConfig(configId) : null;

  // SSR theme injection (D-008): project the stored `WidgetTheme` onto a
  // `Partial<BrandTheme>` overlay and emit per-brand `--brand-*` overrides
  // in <head>. Unspecified fields fall through to
  // @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration mismatch.
  const brandTheme = themeToBrandTheme(config?.config?.theme ?? {});

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        <Providers>
          <RemittanceConfigProvider config={config?.config}>
            {children}
          </RemittanceConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
