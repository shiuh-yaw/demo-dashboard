/**
 * Main Application Entry Point (Server Component)
 *
 * Per-config theming (`?theme=<configId>`) is fully handled at the layout
 * level: middleware forwards the id as `x-wallet-config-id`, layout.tsx
 * fetches the config server-side and emits theme overrides via
 * `<ThemeStyleTag>` plus a `<WalletConfigProvider>` for branding access.
 *
 * This page renders the layout shell + delegates wallet logic to the
 * `WalletApp` client component (Dynamic SDK requires client-side JS).
 */

import { ThemedWidgetLayout } from "@/components/ui/themed-widget-layout";
import { WalletApp } from "@/components/wallet-app";

export default function Home() {
  return (
    <ThemedWidgetLayout>
      <WalletApp />
    </ThemedWidgetLayout>
  );
}
