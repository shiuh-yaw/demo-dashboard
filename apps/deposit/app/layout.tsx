import type { Metadata } from "next";
import { headers } from "next/headers";
import { ThemeStyleTag } from "@dynamic-demos/theme/theme-style-tag";
import { Providers } from "./providers";
import { NetworkBar } from "./network-bar";
import { DepositConfigProvider } from "@/contexts/deposit-config-context";
import { getWalletConfig } from "@/lib/api/wallets";
import { themeToBrandTheme } from "@/lib/deposit-brand";

import "./globals.css";

export const metadata: Metadata = {
  title: "Deposit Demo — Dynamic + Fireblocks",
  description: "Deposit funds via Fireblocks vault with AML screening",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-deposit-config-id");
  const stored = configId ? await getWalletConfig(configId) : null;

  // SSR theme injection (D-008): emit only the `--brand-*` overrides for the
  // tokens deposit personalizes per brand. Everything else falls through to
  // deposit's static `--brand-*` overrides in globals.css and the canonical
  // defaults in @dynamic-demos/theme/defaults.css. Zero FOUC, zero hydration
  // mismatch — the inline <style> beats client paint.
  const brandTheme = themeToBrandTheme(stored?.config?.theme ?? {});

  return (
    <html lang="en">
      <head>
        <ThemeStyleTag theme={brandTheme} overridesOnly />
      </head>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-[400px]">
            <Providers>
              <DepositConfigProvider config={stored?.config ?? null}>
                <NetworkBar />
                {children}
              </DepositConfigProvider>
            </Providers>
          </div>
        </div>
      </body>
    </html>
  );
}
