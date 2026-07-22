"use client";

/**
 * `useMilestoneOnce()` - session-deduped milestone emitter.
 *
 * Thin adapter over `useTrack()` for the milestones that need session-local
 * dedupe (`signed_in`, `wallet_funded`, `receive_viewed` - see
 * `lib/analytics/milestones.ts`). Takes the `WalletMilestone` union, so call
 * sites are type-checked against the taxonomy.
 */

import { useCallback } from "react";
import { useTrack } from "@dynamic-demos/analytics";
import { emitOnce, type WalletMilestone } from "@/lib/analytics/milestones";

export function useMilestoneOnce(): (name: WalletMilestone) => void {
  const { milestone } = useTrack();

  return useCallback(
    (name: WalletMilestone) => {
      emitOnce(name, (n) => milestone(n));
    },
    [milestone],
  );
}
