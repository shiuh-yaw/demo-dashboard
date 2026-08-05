import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  widgetThemeToBrandTheme,
  type WidgetConfig,
} from "@dynamic-demos/theme";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";
import {
  buildScenarioChrome,
  CodePanel,
  ScenarioHero,
  ScenarioLayout,
  SdkStack,
} from "@dynamic-demos/ui";
import { Providers } from "./providers";
import { BrandingProvider } from "@/components/branding-provider";
import { IdentityBridge } from "@/components/analytics/identity-bridge";
import { ScenarioBrandLogo } from "@/components/scenario-brand-logo";
import { buildCodeSteps, CARD_SDK_STEPS } from "@/lib/code-steps";

import "./globals.css";

// React.cache dedupes the dashboard fetch within one request. Empty fallback:
// the default render emits NO overrides, so the canonical D-030 palette from
// @dynamic-demos/theme/defaults.css applies. Per-config ?theme= overrides
// layer on top via <ThemeStyleTag>.
const getCardConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-card-config-id");
  const { config, resolved } = await fetchDemoConfigResult<WidgetConfig>({
    demoType: "card",
    id: configId,
    fallback: {},
  });
  return { configId, config, isBranded: resolved };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getCardConfig();
  return {
    title: config.branding?.name
      ? `${config.branding.name} Card`
      : "Stablecoin Card - Dynamic Demos",
    description:
      "A virtual Visa debit card your users fund with stablecoins - embedded wallet, gasless funding, and card issuance, all built on Dynamic.",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const { config, isBranded } = await getCardConfig();

  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});
  const themeScope =
    headersList.get("x-card-theme-scope") === "widget" ? "widget" : "page";

  // Branded (?theme=) drops the Dynamic SiteHeader and carries the brand
  // identity in the hero's brand row (logo + Book a call) instead - same rule
  // as wallet. Unbranded keeps the Dynamic demos-site header.
  // One call for the chrome contract. `logoPlacement` carries the widget-scope
  // case: under ?scope=widget the logo centers over the widget instead of
  // sitting in the hero.
  const chrome = buildScenarioChrome({
    chip: "Stablecoin Card",
    isBranded,
    brandLogo: <ScenarioBrandLogo align="start" />,
    logoPlacement: themeScope === "widget" ? "widget" : "hero",
  });

  // Every route renders inside one shared scenario shell (hero + live widget
  // column + SDK code panel), so the marketing + integration story stays
  // beside the widget the whole way (login -> apply -> card). Snippets are
  // highlighted here, server-side; the shared CodePanel receives finished HTML.
  const sdkSteps = await buildCodeSteps(CARD_SDK_STEPS);
  const builtWith = (
    <SdkStack
      packages={[
        "@dynamic-labs-sdk/client",
        "@dynamic-labs-sdk/react-hooks",
        "@dynamic-labs-sdk/evm",
      ]}
      link={{
        label: "Rain issuing API",
        href: "https://docs.rain.xyz/",
      }}
    />
  );

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag
          theme={brandTheme}
          overridesOnly
          selector={themeScope === "widget" ? ".brand-scope" : ":root"}
        />
      </head>
      <body>
        {/* GtmTracker wraps Providers so IdentityBridge (needs useTrack here +
            useUser inside Providers) fires the auth milestones from any page.
            No floating BookACallCta - the header/hero carries Book a call. */}
        <GtmTracker demoSlug="card">
          <BrandingProvider
            value={{
              name: config.branding?.name,
              logoUrl: config.branding?.logoUrl || undefined,
            }}
          >
            <ScenarioLayout
              header={chrome.header}
              hero={
                <ScenarioHero
                  logo={chrome.heroLogo}
                  title="A debit card your users fund with stablecoins."
                  titleAccent="Issued in seconds."
                  pitch="Your users sign in with email or social and get an embedded wallet and a virtual Visa card in the same flow. They fund it gaslessly from their own stablecoin balance and spend it anywhere Visa is accepted - issue, fund, and reveal the card in a handful of calls."
                />
              }
              demo={
                // brand-scope: under ?scope=widget a branded config restyles
                // ONLY this subtree (widget + logo); under page scope the
                // overrides sit on :root and this class is inert.
                <div className="brand-scope mx-auto w-full max-w-md lg:mx-0">
                  {themeScope === "widget" && (
                    <ScenarioBrandLogo align="center" />
                  )}
                  <Providers>
                    <IdentityBridge />
                    {children}
                  </Providers>
                </div>
              }
              panel={<CodePanel sdkSteps={sdkSteps} notice={builtWith} />}
              footer={chrome.footer}
            />
          </BrandingProvider>
        </GtmTracker>
      </body>
    </html>
  );
}
