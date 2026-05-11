import type { Metadata } from "next";
import { headers } from "next/headers";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { VisaDirectConfigProvider } from "@/contexts/visa-direct-config-context";
import { getVisaDirectConfig } from "@/lib/api/visa-direct-config";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type VisaDirectConfig,
} from "@/lib/visa-direct-config";
import { themeToBrandTheme } from "@/lib/visa-direct-brand";

import "./globals.css";

export const metadata: Metadata = {
  title: "Visa Direct — Dynamic Demos",
  description:
    "Receive USDC payouts via Visa Direct Push-to-Wallet, powered by Fireblocks custody. Configurable branding via the demo dashboard.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-visa-direct-config-id");
  const stored = configId ? await getVisaDirectConfig(configId) : null;

  const resolvedConfig: VisaDirectConfig = {
    branding: {
      ...DEFAULT_VISA_DIRECT_CONFIG.branding,
      ...stored?.config.branding,
    },
    theme: {
      ...DEFAULT_VISA_DIRECT_CONFIG.theme,
      ...stored?.config.theme,
    },
  };

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for
  // the tokens visa-direct personalizes per brand (primary, primary-hover,
  // accent). Everything else falls through to the static `--brand-*`
  // overrides in globals.css and to @dynamic-demos/theme/defaults.css
  // below that. Zero FOUC, zero hydration mismatch — the inline <style>
  // beats client paint.
  const brandTheme = themeToBrandTheme(resolvedConfig.theme);

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        <Providers>
          <VisaDirectConfigProvider config={resolvedConfig}>
            {children}
          </VisaDirectConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
