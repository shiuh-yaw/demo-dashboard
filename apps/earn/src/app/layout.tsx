import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeStyleTag, buildDemoMetadata } from "@dynamic-demos/theme";
import { fetchDemoConfig } from "@dynamic-demos/theme/fetch-demo-config";
import { DynamicInit } from "@/components/dynamic-init";
import { EarnConfigProvider } from "@/contexts/earn-config-context";
import { DEFAULT_EARN_CONFIG } from "@/lib/earn-config";
import { themeToBrandTheme } from "@/lib/earn-brand";
import "@/app/globals.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

// Static (no branded variant): EarnBranding has no app-name field to
// title the tab with - add one there before switching to generateMetadata.
export const metadata: Metadata = buildDemoMetadata({
  demoName: "Earn",
  description:
    "Stablecoin yield embedded in your product - users deposit USDC into curated vaults from a non-custodial MPC wallet, no wallet setup. Built on Dynamic.",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-earn-config-id");
  const config = await fetchDemoConfig({
    demoType: "earn",
    id: configId,
    fallback: DEFAULT_EARN_CONFIG,
  });

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
        <EarnConfigProvider config={config} configId={configId ?? undefined}>
          <DynamicInit />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </EarnConfigProvider>
      </body>
    </html>
  );
}
