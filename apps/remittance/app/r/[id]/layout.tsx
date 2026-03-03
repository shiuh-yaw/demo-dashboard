/**
 * Remittance Config Layout
 *
 * Loads the Remittance configuration by ID and provides it to all child components.
 * Mirrors the pattern used in apps/earn for /e/[id].
 */

import { notFound } from "next/navigation";
import { getRemittanceConfig } from "@/lib/api/remittance-config";
import { RemittanceConfigProvider } from "@/contexts/remittance-config-context";
import { ThemeWrapper } from "@/components/theme-wrapper";

interface RemittanceConfigLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storedConfig = await getRemittanceConfig(id);
  if (!storedConfig) return { title: "Config Not Found" };

  const title = storedConfig.name || "Remittance";
  return {
    title: `${title} - Remittance Demo`,
    description:
      storedConfig.description || "Send money globally with embedded wallets",
  };
}

export default async function RemittanceConfigLayout({
  children,
  params,
}: RemittanceConfigLayoutProps) {
  const { id } = await params;

  const storedConfig = await getRemittanceConfig(id);
  if (!storedConfig) notFound();

  return (
    <RemittanceConfigProvider config={storedConfig.config}>
      <ThemeWrapper>{children}</ThemeWrapper>
    </RemittanceConfigProvider>
  );
}
