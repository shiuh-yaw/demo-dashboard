import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans } from "next/font/google";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
  type WidgetTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import {
  DynamicLogo,
  ResetThemeButton,
  ScenarioBrandImage,
  ScenarioBrandRow,
  SiteFooter,
  SiteHeader,
} from "@dynamic-demos/ui";
import { GtmTracker } from "@dynamic-demos/analytics";
import { FlowMark } from "@/components/scenario-chrome";
import { IdentityBridge } from "@/components/analytics/identity-bridge";
import { Providers } from "./providers";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Prospect theme payload. Flow has no DemoConfig kind of its own - it
 * fetches with `demoType: "trade"` purely as a payload-shape selector
 * (foregroundColor + branding.logoUrl/appName, what
 * widgetThemeToBrandTheme and buildDemoMetadata consume). The
 * dashboard's prospect fallback makes `?theme=<prospectId>` - or any
 * config id, via its prospect - resolve regardless of the kind asked.
 */
interface FlowThemeConfig {
  theme?: WidgetTheme;
  branding?: { logoUrl?: string; appName?: string };
}

// React.cache dedupes the dashboard fetch across generateMetadata and
// RootLayout within one request (fetchDemoConfig itself is no-store).
const getFlowConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-flow-config-id");
  const config = await fetchDemoConfig<FlowThemeConfig>({
    demoType: "trade",
    id: configId,
    // Flow's env contract names the dashboard origin DASHBOARD_API_URL;
    // fetchDemoConfig's own env chain doesn't include that name.
    dashboardUrl: process.env.DASHBOARD_URL ?? process.env.DASHBOARD_API_URL,
    fallback: {},
  });
  return { configId, config };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getFlowConfig();
  return buildDemoMetadata({
    demoName: "Flow",
    appName: config.branding?.appName,
    description:
      "Accept any crypto, settle any stablecoin - checkout, deposit, and withdraw flows on Fireblocks Flow infrastructure, run live beside the integration code.",
  });
}

/**
 * Shared Dynamic site chrome on every page (SiteHeader with the Flow
 * wordmark as its logo - flow keeps its own product identity - and
 * SiteFooter). The logo links to flow's internal landing; the Demos
 * crumb + hover grid link back to the catalog.
 *
 * Prospect themes (D-008): the middleware forwards `?theme=` as
 * `x-flow-config-id`; branded requests inject `--brand-*` overrides via
 * <ThemeStyleTag overridesOnly> - flow's chrome is fully brand-token
 * driven, so heroes, chips, and cards restyle while the SiteHeader
 * (deliberately unthemed) keeps the Flow identity.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { configId, config } = await getFlowConfig();

  // Overrides ONLY for branded requests - unbranded, flow rides its own
  // static palette in globals.css (no injected block at all).
  const brandTheme = configId
    ? widgetThemeToBrandTheme(config.theme ?? {})
    : {};

  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body className={`${dmSans.className} bg-(--brand-page-bg)`}>
        {/* GTM: NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this is safe
            to mount unconditionally (analytics package guarantee). */}
        <GtmTracker demoSlug="flow">
          <Providers>
            <IdentityBridge />
            <div className="flex min-h-dvh flex-col">
              {configId ? (
                // Branded rule (wallet/earn/trade parity): the Dynamic
                // site header hides and the shared brand bar takes its
                // place. Non-sticky on flow - the scenario pages pin their
                // widget column at lg:top-6 to match.
                <ScenarioBrandRow
                  variant="bar"
                  sticky={false}
                  logoHref="/"
                  logo={
                    config.branding?.logoUrl ? (
                      <ScenarioBrandImage
                        src={config.branding.logoUrl}
                        alt={`${config.branding?.appName ?? "Brand"} logo`}
                        align="bar"
                      />
                    ) : (
                      // Logo-less prospects keep the Dynamic lockup - an
                      // empty bar reads broken.
                      <DynamicLogo wordmark className="h-[34px] w-auto" />
                    )
                  }
                />
              ) : (
                <SiteHeader
                  chip="Flow"
                  logo={<FlowMark />}
                  logoHref="/"
                  sticky={false}
                />
              )}
              <div className="flex-1">{children}</div>
              {/* Branded requests get the clear affordance site-wide,
                  riding the footer's links row - flow has no single
                  widget column that owns it. */}
              <SiteFooter
                extraLinks={<ResetThemeButton active={!!configId} variant="link" />}
              />
            </div>
          </Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
