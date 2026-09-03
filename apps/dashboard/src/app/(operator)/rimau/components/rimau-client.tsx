"use client";

/**
 * Thin wrapper: rimau list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { rimauListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredRimauConfig } from "@/lib/types/dashboard";

interface RimauClientProps {
  initialConfigs: StoredRimauConfig[];
  orphanedConfigs: StoredRimauConfig[];
  currentUserId?: string;
}

export function RimauClient(props: RimauClientProps) {
  return <DemoKindListClient config={rimauListConfig} {...props} />;
}
