import { cache } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { headers } from "next/headers";
import {
  buildDemoMetadata,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { TradeConfigProvider } from "@/contexts/trade-config-context";
import type { TradeConfig } from "@/lib/trade-config";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// React.cache dedupes the dashboard fetch across generateMetadata and
// RootLayout within one request (fetchDemoConfig itself is no-store).
const getTradeConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-trade-config-id");
  const config = await fetchDemoConfig<TradeConfig>({
    demoType: "trade",
    id: configId,
    fallback: {},
  });
  return { configId, config };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getTradeConfig();
  return buildDemoMetadata({
    demoName: "Trade",
    appName: config.branding?.appName,
    description:
      "One app, every market - token markets, real-world events, and onchain swaps behind an invisible embedded wallet. Built on Dynamic.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { configId, config } = await getTradeConfig();

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens trade personalizes per brand. Everything else falls through to
  // trade's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = widgetThemeToBrandTheme(config.theme ?? {});

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${inter.variable}`}
    >
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body className="bg-trade-bg text-trade-text-primary font-sans antialiased">
        <Providers>
          <TradeConfigProvider config={config} configId={configId ?? undefined}>
            {children}
          </TradeConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
