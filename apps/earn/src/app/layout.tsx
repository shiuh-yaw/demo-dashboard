import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeStyleTag, buildDemoMetadata } from "@dynamic-demos/theme";
import { GtmTracker } from "@dynamic-demos/analytics";
import { DynamicInit } from "@/components/dynamic-init";
import { IdentityBridge } from "@/components/analytics/identity-bridge";
import { EarnConfigProvider } from "@/contexts/earn-config-context";
import { getEarnConfig } from "@/lib/get-earn-config";
import { themeToBrandTheme } from "@/lib/earn-brand";
import "@/app/globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getEarnConfig();
  return buildDemoMetadata({
    demoName: "Earn",
    appName: config.branding?.appName,
    description:
      "Stablecoin yield embedded in your product - users deposit USDC into curated vaults from a non-custodial MPC wallet, no wallet setup. Built on Dynamic.",
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { configId, config } = await getEarnConfig();

  // SSR theme injection (D-008): emit `--brand-*` overrides ONLY for
  // branded configs (?theme= resolved an id). Unbranded, earn rides the
  // canonical D-030 defaults from @dynamic-demos/theme/defaults.css -
  // DEFAULT_EARN_CONFIG's baked-in theme must NOT reach ThemeStyleTag or
  // it repaints the whole app (and the scenario chrome) off-canon. Zero
  // FOUC, zero hydration mismatch — the inline <style> beats client paint.
  const brandTheme = configId ? themeToBrandTheme(config.theme) : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        {/* GTM Phase 09: NEXT_PUBLIC_TRACK_URL unset -> total no-op, so this
            is safe to mount unconditionally (Phase 02 guarantee). */}
        <GtmTracker demoSlug="earn">
          <EarnConfigProvider config={config} configId={configId ?? undefined}>
            <DynamicInit />
            <IdentityBridge />
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </EarnConfigProvider>
        </GtmTracker>
      </body>
    </html>
  );
}
