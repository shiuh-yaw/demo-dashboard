/**
 * Main Application Entry Point (Server Component)
 *
 * This is a server component that renders the page shell immediately,
 * avoiding a loading spinner on initial page load.
 *
 * Supports optional theming via query params:
 * - /?id=<config-id> - Fetch config from dashboard API
 * - /?config=<base64-encoded-config> - Apply inline config (for preview)
 *
 * The Dynamic SDK requires client-side JavaScript, so the actual app
 * logic is delegated to the WalletApp client component.
 */

import { WidgetLayout } from "@/components/ui/widget-layout";
import { ThemedWidgetLayout } from "@/components/ui/themed-widget-layout";
import { WalletApp } from "@/components/wallet-app";
import { getWalletConfig } from "@/lib/api/wallets";
import type { WidgetConfig } from "@dynamic-demos/theme";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; config?: string }>;
}) {
  const { id, config: configParam } = await searchParams;

  let config: WidgetConfig | undefined;

  // Priority 1: Fetch config by ID from dashboard API
  if (id) {
    const storedConfig = await getWalletConfig(id);
    if (storedConfig) {
      config = storedConfig.config;
    }
  }

  // Priority 2: Parse base64-encoded inline config (for preview)
  if (!config && configParam) {
    try {
      const decoded = Buffer.from(configParam, "base64").toString("utf-8");
      config = JSON.parse(decoded);
    } catch {
      // Invalid config, fall through to default layout
    }
  }

  // Use themed layout if config provided, otherwise default
  if (config) {
    return (
      <ThemedWidgetLayout config={config}>
        <WalletApp />
      </ThemedWidgetLayout>
    );
  }

  return (
    <WidgetLayout>
      <WalletApp />
    </WidgetLayout>
  );
}
