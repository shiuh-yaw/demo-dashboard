import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import Providers from "@/lib/providers";
import { ShopConfigProvider } from "@/contexts/shop-config-context";
import { getShopConfig } from "@/lib/api/shops";
import { themeToBrandTheme } from "@/lib/shop-brand";
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
  const stored = configId ? await getShopConfig(configId) : null;

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for
  // the tokens shop personalizes per brand. Everything else falls through
  // to shop's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = themeToBrandTheme(stored?.config?.theme ?? {});

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>
          <ShopConfigProvider config={stored?.config ?? null}>
            {children}
          </ShopConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
