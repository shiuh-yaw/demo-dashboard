import type { Metadata } from "next";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";
import { Providers } from "./providers";
import { IdentityBridge } from "@/components/analytics/identity-bridge";
import { RimauConfigProvider } from "@/contexts/rimau-config-context";
import { getRimauConfig } from "@/lib/get-rimau-config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getRimauConfig();
  return buildDemoMetadata({
    demoName: "Rimau",
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
  const { configId, config, isBranded } = await getRimauConfig();

  // SSR theme injection (D-008): only the --brand-* overrides a prospect
  // config personalizes; everything else falls through to Rimau's amber
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
        <GtmTracker demoSlug="rimau">
          <Providers>
            <IdentityBridge />
            <RimauConfigProvider
              config={config}
              configId={configId ?? undefined}
              isBranded={isBranded}
            >
              {children}
            </RimauConfigProvider>
          </Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
