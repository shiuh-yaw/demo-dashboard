import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { VisaDirectConfigProvider } from "@/contexts/visa-direct-config-context";
import { getVisaDirectConfig } from "@/lib/api/visa-direct-config";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  themeToCssVars,
  type VisaDirectConfig,
} from "@/lib/visa-direct-config";

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

  const themeCss = themeToCssVars(resolvedConfig.theme);

  return (
    <html lang="en">
      <head>
        {/*
          Inline theme override rendered server-side so --widget-* CSS vars
          wins over the defaults in globals.css before any client JS runs.
          This avoids a flash of the default (unbranded) palette when a
          custom theme is configured.
        */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
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
