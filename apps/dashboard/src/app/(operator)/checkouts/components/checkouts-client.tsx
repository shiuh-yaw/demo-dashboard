"use client";

/**
 * Thin wrapper: checkouts list page over the shared `DemoKindListClient`.
 */

import { DemoKindListClient } from "@/components/shared/demo-kind-list-client";
import { checkoutListConfig } from "@/components/shared/demo-kind-list-registry";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";

interface CheckoutsClientProps {
  initialCheckouts: StoredCheckoutConfig[];
  orphanedCheckouts: StoredCheckoutConfig[];
  currentUserId?: string;
  currentUserEmail?: string;
}

export function CheckoutsClient({
  initialCheckouts,
  orphanedCheckouts,
  currentUserId,
}: CheckoutsClientProps) {
  return (
    <DemoKindListClient
      config={checkoutListConfig}
      initialConfigs={initialCheckouts}
      orphanedConfigs={orphanedCheckouts}
      currentUserId={currentUserId}
    />
  );
}
