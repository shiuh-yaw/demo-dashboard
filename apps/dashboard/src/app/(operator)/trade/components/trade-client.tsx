"use client";

/**
 * Thin wrapper: trade list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { tradeListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredTradeConfig } from "@/lib/types/dashboard";

interface TradeClientProps {
  initialConfigs: StoredTradeConfig[];
  orphanedConfigs: StoredTradeConfig[];
  currentUserId?: string;
}

export function TradeClient(props: TradeClientProps) {
  return <DemoKindListClient config={tradeListConfig} {...props} />;
}
