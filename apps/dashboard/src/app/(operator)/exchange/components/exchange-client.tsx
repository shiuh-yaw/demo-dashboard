"use client";

/**
 * Thin wrapper: exchange list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { exchangeListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredExchangeConfig } from "@/lib/types/dashboard";

interface ExchangeClientProps {
  initialConfigs: StoredExchangeConfig[];
  orphanedConfigs: StoredExchangeConfig[];
  currentUserId?: string;
}

export function ExchangeClient(props: ExchangeClientProps) {
  return <DemoKindListClient config={exchangeListConfig} {...props} />;
}
