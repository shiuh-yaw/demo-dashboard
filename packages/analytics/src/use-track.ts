"use client";

/**
 * `useTrack()` - typed event emitters for demo-specific funnel events.
 *
 * Outside a `<GtmTracker>` provider (or with the queue mis-wired) these are
 * no-ops, never errors - fail-silent per the tracker's prime invariant.
 * `props` payloads are size-capped client-side (2048 chars serialized);
 * oversized props are dropped with a `console.debug`, never an error.
 */

import { useCallback } from "react";
import { useGtmTrackerContext } from "./tracker";
import { generateUuid } from "./cookies";
import { MAX_PROPS_SERIALIZED_LENGTH } from "./schema";
import type { TrackEvent } from "./schema";

export interface UseTrackResult {
  milestone: (name: string, props?: Record<string, unknown>) => void;
  step: (name: string, props?: Record<string, unknown>) => void;
}

function capProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  try {
    const serialized = JSON.stringify(props);
    if (serialized.length > MAX_PROPS_SERIALIZED_LENGTH) {
      if (typeof console !== "undefined" && console.debug) {
        console.debug("[analytics] dropping oversized props", {
          length: serialized.length,
          max: MAX_PROPS_SERIALIZED_LENGTH,
        });
      }
      return undefined;
    }
    return props;
  } catch {
    // Non-serializable props (circular refs, bigint, etc.) - drop silently.
    return undefined;
  }
}

export function useTrack(): UseTrackResult {
  const ctx = useGtmTrackerContext();

  const emit = useCallback(
    (
      type: TrackEvent["type"],
      name: string,
      props?: Record<string, unknown>,
    ) => {
      try {
        if (!ctx) return;
        const event: TrackEvent = {
          eventId: generateUuid(),
          type,
          name,
          ts: Date.now(),
        };
        const cappedProps = capProps(props);
        if (cappedProps) event.props = cappedProps;
        ctx.queue.enqueue(event);
      } catch {
        // fail-silent
      }
    },
    [ctx],
  );

  const milestone = useCallback(
    (name: string, props?: Record<string, unknown>) => {
      emit("milestone", name, props);
    },
    [emit],
  );

  const step = useCallback(
    (name: string, props?: Record<string, unknown>) => {
      emit("step", name, props);
    },
    [emit],
  );

  return { milestone, step };
}
