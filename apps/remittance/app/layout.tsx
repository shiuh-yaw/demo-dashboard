import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { RemittanceConfigProvider } from "@/contexts/remittance-config-context";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { getRemittanceConfig } from "@/lib/api/remittance-config";
import { themeToCssVars } from "@/lib/remittance-config";

import "./globals.css";

export const metadata: Metadata = {
  title: "Remittance Demo — Dynamic + Fireblocks",
  description:
    "Send money globally with embedded wallets, gas-sponsored USDC transfers on Base Sepolia, and Fireblocks custody",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configId = headersList.get("x-remittance-config-id");
  const config = configId ? await getRemittanceConfig(configId) : null;

  // Apply theme CSS variables on the server to avoid flash of default styles
  const themeVars = themeToCssVars(config?.config?.theme ?? {});
  const themeStyle = Object.entries(themeVars).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: value }),
    {} as React.CSSProperties,
  );

  return (
    <html lang="en" style={themeStyle}>
      <body>
        <Providers>
          <RemittanceConfigProvider config={config?.config}>
            <ThemeWrapper>{children}</ThemeWrapper>
          </RemittanceConfigProvider>
        </Providers>
      </body>
    </html>
  );
}
