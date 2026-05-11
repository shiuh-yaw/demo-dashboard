import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { ThemeStyleTag } from "@dynamic-demos/theme";

import Providers from "@/lib/providers";
import { CheckoutsConfigProvider } from "@/contexts/checkouts-config-context";
import { getCheckoutConfig } from "@/lib/api/checkouts";
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
  title: "Payment Widget",
  description: "Accept crypto payments with Dynamic SDK",
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
  const stored = configId ? await getCheckoutConfig(configId) : null;
  const brandTheme = themeToBrandTheme(stored?.config?.theme ?? {});

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} font-sans antialiased bg-(--brand-page-bg)`}
      >
        <Providers>
          <CheckoutsConfigProvider config={stored?.config ?? null}>
            {children}
          </CheckoutsConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
