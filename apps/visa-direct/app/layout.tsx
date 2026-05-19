import type { Metadata } from "next";
import { headers } from "next/headers";
import { widgetThemeToBrandTheme } from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { VisaDirectConfigProvider } from "@/contexts/visa-direct-config-context";
import { DEFAULT_VISA_DIRECT_CONFIG } from "@/lib/visa-direct-config";

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
  // visaDirectMapper.toStored already bakes brand colour + record
  // themeOverrides into the returned config, so the shallow-merge inside
  // fetchDemoConfig only needs the top-level (theme, branding) keys
  // replaced atomically — no further deep merge required here.
  const resolvedConfig = await fetchDemoConfig({
    demoType: "visa-direct",
    id: configId,
    fallback: DEFAULT_VISA_DIRECT_CONFIG,
  });

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for
  // the tokens visa-direct personalizes per brand (primary, primary-hover,
  // accent). Everything else falls through to the static `--brand-*`
  // overrides in globals.css and to @dynamic-demos/theme/defaults.css
  // below that. Zero FOUC, zero hydration mismatch — the inline <style>
  // beats client paint.
  const brandTheme = widgetThemeToBrandTheme(resolvedConfig.theme);

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
