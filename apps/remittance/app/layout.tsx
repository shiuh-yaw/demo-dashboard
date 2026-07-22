import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { RemittanceConfigProvider } from "@/contexts/remittance-config-context";
import type { RemittanceConfig } from "@/lib/remittance-config";

import "./globals.css";

// React.cache dedupes the dashboard fetch across generateMetadata and
// RootLayout within one request (fetchDemoConfig itself is no-store).
const getRemittanceConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-remittance-config-id");
  const config = await fetchDemoConfig<RemittanceConfig>({
    demoType: "remittance",
    id: configId,
    fallback: {},
  });
  return { configId, config };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getRemittanceConfig();
  return buildDemoMetadata({
    demoName: "Remittance",
    appName: config.branding?.appName,
    description:
      "Cross-border payouts from an embedded wallet - USDC in, pix/spei/pse/cbu out, run live beside the integration code. Built on Dynamic.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config, configId } = await getRemittanceConfig();

  // SSR theme injection (D-008): project the stored WidgetTheme onto a
  // Partial<BrandTheme> overlay and emit per-brand --brand-* overrides
  // in <head>. deriveCardGradient seeds the card gradient from
  // secondaryColor / darkened primary when no explicit gradient is set.
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {}, {
    deriveCardGradient: true,
  });

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        <Providers>
          <RemittanceConfigProvider
            config={config}
            configId={configId ?? undefined}
          >
            {children}
          </RemittanceConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
