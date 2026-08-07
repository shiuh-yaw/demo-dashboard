import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
  type WidgetConfig,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";
import { Providers } from "./providers";
import { AccountsConfigProvider } from "@/contexts/accounts-config-context";
import { IdentityBridge } from "@/components/analytics/identity-bridge";

import "./globals.css";

/**
 * React.cache dedupes the dashboard fetch across generateMetadata and
 * RootLayout within one request (fetchDemoConfig itself is no-store). Empty
 * fallback: the default render emits NO theme overrides, so the default chrome
 * IS the canonical D-030 palette from @dynamic-demos/theme/defaults.css.
 */
const getAccountsConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-accounts-config-id");
  const config = await fetchDemoConfig<WidgetConfig>({
    demoType: "accounts",
    id: configId,
    fallback: {},
  });
  return { configId, config };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getAccountsConfig();
  return buildDemoMetadata({
    demoName: "Accounts",
    // `name` is the canonical field; configs seeded from a prospect before
    // that was fixed carry `appName` instead, and an unbranded tab title on a
    // shared link is the one thing this must not get wrong.
    appName:
      config.branding?.name ??
      (config.branding as { appName?: string } | undefined)?.appName,
    description:
      "Business accounts on Dynamic - shared MPC wallets with multiple signers, and admin reach kept separate from signing authority.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const { config } = await getAccountsConfig();

  // SSR theme injection (D-008): emit only the `--brand-*` overrides a branded
  // config personalizes; everything else falls through to the canonical
  // defaults. Zero FOUC, zero hydration mismatch - the inline <style> beats
  // client paint.
  //
  // `?scope=` (sticky, like `?theme=`) picks how much of the page the brand
  // owns: "page" (default - overrides on :root) or "widget" (confined to
  // .brand-scope, so hero, panel, and site chrome keep the Dynamic look).
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});
  const themeScope =
    headersList.get("x-accounts-theme-scope") === "widget" ? "widget" : "page";

  return (
    // Wallet extensions stamp attributes onto <html> before React hydrates
    // (TokenPocket adds `data-tp-bcm-channel="TokenPocket:<random>"`), which
    // React reports as a hydration mismatch the app cannot fix. Suppression is
    // scoped to this element's own attributes and text, so a real mismatch
    // anywhere below still warns. Matches checkouts / flow / trade / shop /
    // earn / dashboard, which all do the same.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag
          theme={brandTheme}
          overridesOnly
          selector={themeScope === "widget" ? ".brand-scope" : ":root"}
        />
      </head>
      {/* Wallet extensions inject attributes on `<body>` before React
          hydrates - `ontouchstart=""` from TokenPocket is the usual one - and
          every visitor to a wallet demo has at least one installed. Nothing in
          this app renders that attribute, so there is no real mismatch to
          find: without this, the dev overlay throws a hydration error on load
          that is entirely someone else's markup. Scoped to `<body>`, not the
          subtree, so a genuine mismatch in our own components still reports. */}
      <body suppressHydrationWarning>
        {/* NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this is safe to
            mount unconditionally. No floating BookACallCta: the header and
            hero already carry the real Book a call. */}
        <GtmTracker demoSlug="accounts">
          <IdentityBridge />
          <Providers>
            <AccountsConfigProvider config={config}>
              {children}
            </AccountsConfigProvider>
          </Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
