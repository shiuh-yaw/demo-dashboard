import type { Metadata } from "next";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";
import { Providers } from "./providers";
import { IdentityBridge } from "@/components/analytics/identity-bridge";
import { ExchangeConfigProvider } from "@/contexts/exchange-config-context";
import { getExchangeConfig } from "@/lib/get-exchange-config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getExchangeConfig();
  return buildDemoMetadata({
    demoName: "Exchange",
    appName: config.branding?.appName,
    description:
      "A non-custodial embedded wallet inside a consumer exchange app - social login, in-app yield, sponsored transfers, device recovery, and the 2-of-2 key split made visible. Built on Dynamic.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { configId, config, isBranded } = await getExchangeConfig();

  // SSR theme injection (D-008): only the --brand-* overrides a prospect
  // config personalizes; everything else falls through to Exchange's amber
  // palette in globals.css, then to the canonical defaults. Zero FOUC.
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body className="min-h-dvh antialiased">
        {/* NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this mounts
            unconditionally. No floating BookACallCta: the site header carries
            Book a call on the scenario page. */}
        <GtmTracker demoSlug="exchange">
          <Providers>
            <IdentityBridge />
            <ExchangeConfigProvider
              config={config}
              configId={configId ?? undefined}
              isBranded={isBranded}
            >
              {children}
            </ExchangeConfigProvider>
          </Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
