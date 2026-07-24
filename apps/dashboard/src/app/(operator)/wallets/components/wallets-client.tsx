"use client";

/**
 * Thin wrapper: wallets list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { walletListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredWalletConfig } from "@/lib/types/dashboard";

interface WalletsClientProps {
  initialConfigs: StoredWalletConfig[];
  orphanedConfigs: StoredWalletConfig[];
  currentUserId?: string;
}

export function WalletsClient(props: WalletsClientProps) {
  return <DemoKindListClient config={walletListConfig} {...props} />;
}
