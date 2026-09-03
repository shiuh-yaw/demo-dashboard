"use client";

import { useCallback } from "react";
import { useTrack } from "@dynamic-demos/analytics";
import type { RimauMilestone } from "@/lib/analytics/milestones";

/** Typed `milestone()` so call sites are checked against the taxonomy. */
export function useMilestone() {
  const { milestone } = useTrack();
  return useCallback(
    (name: RimauMilestone, props?: Record<string, unknown>) => milestone(name, props),
    [milestone],
  );
}
