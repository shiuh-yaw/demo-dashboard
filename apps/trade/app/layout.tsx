import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { getTradeConfig } from "@/lib/api/trade-config";
import { TradeConfigProvider } from "@/contexts/trade-config-context";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { themeToCssVars } from "@/lib/trade-config";

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
  const stored = configId ? await getTradeConfig(configId) : null;

  // Apply theme CSS variables on the server to avoid flash of default styles
  const themeVars = themeToCssVars(stored?.config?.theme ?? {});
  const themeStyle = Object.entries(themeVars).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: value }),
    {} as React.CSSProperties,
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${inter.variable}`}
      style={themeStyle}
    >
      <body className="bg-trade-bg text-trade-text-primary font-sans antialiased">
        <Providers>
          <TradeConfigProvider config={stored?.config}>
            <ThemeWrapper>{children}</ThemeWrapper>
          </TradeConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
