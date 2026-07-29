"use client";

/**
 * `useMilestoneOnce()` - session-deduped milestone emitter.
 *
 * Thin adapter over `useTrack()` for the milestones that need session-local
 * dedupe (`signed_in`, `card_viewed`, `wallet_funded` - see
 * `lib/analytics/milestones.ts`). Takes the `CardMilestone` union, so call
 * sites are type-checked against the taxonomy.
 */

import { useCallback } from "react";
import { useTrack } from "@dynamic-demos/analytics";
import { emitOnce, type CardMilestone } from "@/lib/analytics/milestones";

export function useMilestoneOnce(): (name: CardMilestone) => void {
  const { milestone } = useTrack();

  return useCallback(
    (name: CardMilestone) => {
      emitOnce(name, (n) => milestone(n));
    },
    [milestone],
  );
}
