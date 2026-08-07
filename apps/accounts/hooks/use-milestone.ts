"use client";

/**
 * Typed milestone emitters over `useTrack()`.
 *
 * `useTrack().milestone` takes a plain `string`, so both hooks narrow it to
 * `AccountsMilestone`: an undocumented or misspelled event name is a type
 * error rather than a silently-shipped event.
 */

import { useCallback } from "react";
import { useTrack } from "@dynamic-demos/analytics";
import { emitOnce, type AccountsMilestone } from "@/lib/analytics/milestones";

/**
 * Per-action emitter. Fires every time - a second wallet created in one
 * session is a second `account_wallet_created`.
 */
export function useMilestone(): (
  name: AccountsMilestone,
  props?: Record<string, unknown>,
) => void {
  const { milestone } = useTrack();

  return useCallback(
    (name: AccountsMilestone, props?: Record<string, unknown>) => {
      milestone(name, props);
    },
    [milestone],
  );
}

/**
 * Session-deduped emitter, for the milestones whose trigger re-evaluates on
 * every render (auth success).
 */
export function useMilestoneOnce(): (name: AccountsMilestone) => void {
  const { milestone } = useTrack();

  return useCallback(
    (name: AccountsMilestone) => {
      emitOnce(name, (n) => milestone(n));
    },
    [milestone],
  );
}
