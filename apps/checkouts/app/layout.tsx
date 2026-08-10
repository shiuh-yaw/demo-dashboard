import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { ThemeStyleTag } from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";

import Providers from "@/lib/providers";
import { CheckoutsConfigProvider } from "@/contexts/checkouts-config-context";
import { DEPOSIT_CONFIG } from "@/lib/widget-config";
import { themeToBrandTheme } from "@/lib/checkouts-brand";

import "@/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // "Checkouts" is the demo's name in the shared catalog, the landing card,
  // the nav grid and the OG image - the app must not call itself something
  // else ("Payment Widget") in the one place a shared link shows a title.
  title: "Checkouts - Dynamic Demos",
  description: "Embedded payment widget for crypto deposits and purchases.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root Layout (server component)
 *
 * Per the unified theme injection pattern (D-008):
 * - `middleware.ts` resolves the config id from `?theme=` (or the
 *   sticky `checkouts_config_id` cookie) and forwards it as
 *   `x-checkouts-config-id`. Legacy `/w/:id/...` URLs are redirected
 *   to `/?theme=:id` by `next.config.ts`.
 * - This layout reads the header, fetches the brand config server-side,
 *   and emits per-brand `--brand-*` overrides via `<ThemeStyleTag
 *   overridesOnly>` in `<head>`. SSR injection beats client paint —
 *   zero FOUC, zero hydration mismatch.
 * - The fetched config is provided to client components via
 *   `<CheckoutsConfigProvider>` so branding (logo, name, showPoweredBy)
 *   and widget settings can be read without re-fetching.
 *
 * Background color is sourced from `--brand-page-bg` (defined in
 * `globals.css` as checkouts' static appearance, overridden per-brand by
 * the inline `<style>` above).
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  const headersList = await headers();
  const configId = headersList.get("x-checkouts-config-id");
  const config = await fetchDemoConfig({
    demoType: "checkout",
    id: configId,
    fallback: DEPOSIT_CONFIG,
  });
  const brandTheme = themeToBrandTheme(config.theme ?? {});

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased bg-(--brand-page-bg)`}
      >
        <Providers>
          <CheckoutsConfigProvider config={config}>
            {children}
          </CheckoutsConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
