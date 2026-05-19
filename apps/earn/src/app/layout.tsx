import type { Metadata } from "next";
import { headers } from "next/headers";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeStyleTag } from "@dynamic-demos/theme";
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

export const metadata: Metadata = {
  title: "Earn Dashboard",
  description: "Earn Dashboard",
};

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

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens earn personalizes per brand. Everything else falls through to
  // earn's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = themeToBrandTheme(config.theme);

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
