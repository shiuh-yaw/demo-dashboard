import type { Metadata } from "next";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { GtmTracker } from "@dynamic-demos/analytics";

import { getConnectConfig } from "@/lib/connections-config";
import { Providers } from "./providers";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getConnectConfig();
  return buildDemoMetadata({
    demoName: "Connections",
    appName: config.branding?.appName,
    description:
      "A hosted wallet-connect page for 600+ EVM and Solana wallets, with no wallet SDK in your app. Redirect back with the address, or go headless to sign messages and transactions.",
  });
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config } = await getConnectConfig();

  // SSR theme injection (D-008): emit only the `--brand-*` overrides a branded
  // config personalizes; everything else falls through to the canonical
  // defaults. Zero FOUC, zero hydration mismatch - the inline <style> beats
  // client paint.
  //
  // Always scoped to :root here, unlike wallet's `?scope=` split. The whole
  // point of this demo is the widget, and its two embed targets render nothing
  // but the widget - so there is no surrounding Dynamic chrome for a
  // widget-scoped brand to leave alone.
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        {/* NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this is safe to mount
            unconditionally. No floating BookACallCta: the scenario page's
            header/hero carries the real one, and a floating CTA would follow
            the widget into an integrator's iframe. */}
        <GtmTracker demoSlug="connections">
          <Providers>{children}</Providers>
        </GtmTracker>
      </body>
    </html>
  );
}
