import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import {
  DEFAULT_WIDGET_CONFIG,
  widgetThemeToBrandTheme,
} from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import Providers from "@/lib/providers";
import { ShopConfigProvider } from "@/contexts/shop-config-context";
import "@/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crypto Shop",
  description: "Browse and pay with crypto via Dynamic SDK",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-shop-config-id");
  // Shop has no dedicated storage kind today — it reuses wallet records.
  // Until shop gets its own kind in `DEMO_CONFIG_KINDS`, this just falls
  // back to the unbranded default on every request (configId is null
  // because middleware never resolves a shop-specific id).
  const config = await fetchDemoConfig({
    demoType: "wallet",
    id: configId,
    fallback: DEFAULT_WIDGET_CONFIG,
  });

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for
  // the tokens shop personalizes per brand. Everything else falls through
  // to shop's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = widgetThemeToBrandTheme(config.theme);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          <ShopConfigProvider config={config}>
            {children}
          </ShopConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
