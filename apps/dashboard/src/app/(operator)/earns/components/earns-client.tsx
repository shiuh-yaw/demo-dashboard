"use client";

/**
 * Thin wrapper: earns list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { earnListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredEarnConfig } from "@/lib/types/dashboard";

interface EarnsClientProps {
  initialConfigs: StoredEarnConfig[];
  orphanedConfigs: StoredEarnConfig[];
  currentUserId?: string;
}

export function EarnsClient(props: EarnsClientProps) {
  return <DemoKindListClient config={earnListConfig} {...props} />;
}
