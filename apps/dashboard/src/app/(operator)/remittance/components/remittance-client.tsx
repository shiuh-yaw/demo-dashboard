"use client";

/**
 * Thin wrapper: remittance list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { remittanceListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredRemittanceConfig } from "@/lib/types/dashboard";

interface RemittanceClientProps {
  initialConfigs: StoredRemittanceConfig[];
  orphanedConfigs: StoredRemittanceConfig[];
  currentUserId?: string;
}

export function RemittanceClient(props: RemittanceClientProps) {
  return <DemoKindListClient config={remittanceListConfig} {...props} />;
}
