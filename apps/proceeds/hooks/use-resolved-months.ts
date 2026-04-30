"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  monthlyProceeds,
  type MonthlyProceeds,
} from "@/lib/mock-data";
import {
  getPayoutDemoSnapshot,
  subscribePayoutDemo,
} from "@/lib/payout-demo-store";
import { formatDateShort } from "@/lib/format";

/**
 * Merge mocked months with any persisted demo-payout state. When the
 * presenter runs "Pay out now" for an estimated month, the corresponding
 * entry flips to "paid" with the real on-chain settlement hash.
 *
 * Subscribes to the payout-demo store via `useSyncExternalStore` so updates
 * propagate without effect+state ping-pong.
 */
export function useResolvedMonths(): MonthlyProceeds[] {
  const records = useSyncExternalStore(
    subscribePayoutDemo,
    getPayoutDemoSnapshot,
    getPayoutDemoSnapshot,
  );

  return useMemo(
    () =>
      monthlyProceeds.map((m) => {
        const record = records[m.monthKey];
        if (!record) return m;
        return {
          ...m,
          status: "paid" as const,
          issuedDate: formatDateShort(record.paidAt),
          settlementHash: record.settlementHash,
        };
      }),
    [records],
  );
}
