import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { headers } from "next/headers";
import { widgetThemeToBrandTheme } from "@dynamic-demos/theme";
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

export const metadata: Metadata = {
  title: "Trade -- Dynamic Demos",
  description:
    "Crypto trading demo with Dynamic SDK auth, config-driven branding, and modern wallet UI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-trade-config-id");
  const config = await fetchDemoConfig<TradeConfig>({
    demoType: "trade",
    id: configId,
    fallback: {},
  });

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
          <TradeConfigProvider config={config}>
            {children}
          </TradeConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
