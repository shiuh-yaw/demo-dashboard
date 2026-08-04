"use client";

/**
 * `useTrack()` - typed event emitters matching common analytics libraries
 * (Segment/Amplitude): `identify` / `track` / `page`, plus the demo funnel's
 * `milestone` and the deprecated `step` alias for `track`.
 *
 * Outside a `<GtmTracker>` provider (or with the queue mis-wired) these are
 * no-ops, never errors - fail-silent per the tracker's prime invariant.
 * `props`/`traits` payloads are size-capped client-side (2048 chars
 * serialized); oversized or non-serializable ones are dropped with a
 * `console.debug`, never an error.
 */

import { useCallback } from "react";
import { useGtmTrackerContext } from "./tracker";
import { generateUuid } from "./cookies";
import { MAX_PROPS_SERIALIZED_LENGTH } from "./schema";
import type { TrackEvent, TrackIdentity } from "./schema";

export interface UseTrackResult {
  /**
   * Session-level identity. Sets the queue's identity (last-wins, traits
   * merged across calls - so every batch from here on carries `identity`)
   * and enqueues a single `type: "identify"` marker event (no props - the
   * batch-level `identity` is the authoritative carrier, so userId/email/
   * traits are never duplicated into event props). `email` is pulled out of
   * `traits.email` when it's a string of at most 320 chars (dropped
   * otherwise); the rest of `traits` passes through (size-capped, same as
   * `track`/`milestone` props).
   */
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  /** Emits `type: "step"` - the Segment/Amplitude-shaped name for a funnel step. */
  track: (name: string, props?: Record<string, unknown>) => void;
  /**
   * Manual pageview (`type: "pageview"`), in addition to the automatic
   * pageview `<GtmTracker>` already emits on mount/route-change. `name`, when
   * given, is folded into `props.name`.
   */
  page: (name?: string, props?: Record<string, unknown>) => void;
  milestone: (name: string, props?: Record<string, unknown>) => void;
  /** @deprecated - use `track`. Still emits `type: "step"`, unchanged. */
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

  const track = useCallback(
    (name: string, props?: Record<string, unknown>) => {
      emit("step", name, props);
    },
    [emit],
  );

  /** @deprecated - use `track`. */
  const step = useCallback(
    (name: string, props?: Record<string, unknown>) => {
      emit("step", name, props);
    },
    [emit],
  );

  const page = useCallback(
    (name?: string, props?: Record<string, unknown>) => {
      const pageProps = name !== undefined ? { ...(props ?? {}), name } : props;
      emit("pageview", "pageview", pageProps);
    },
    [emit],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      try {
        if (!ctx) return;
        const { email: traitEmail, ...restTraits } = traits ?? {};
        // Client-side email guard mirrors the server's `identitySchema.email`
        // cap (max 320) - drop rather than truncate, same "reject the whole
        // field" posture as capProps below.
        const email =
          typeof traitEmail === "string" && traitEmail.length <= 320
            ? traitEmail
            : undefined;
        const hasRestTraits = Object.keys(restTraits).length > 0;
        const cappedTraits = capProps(hasRestTraits ? restTraits : undefined);

        const identity: TrackIdentity = {
          userId,
          ...(email ? { email } : {}),
          ...(cappedTraits ? { traits: cappedTraits } : {}),
        };
        ctx.queue.setIdentity(identity);

        // The identify event carries no props - `batch.identity` (set via
        // `setIdentity` above) is the authoritative carrier for userId/email/
        // traits. Re-merging them here would bypass capProps: the merged
        // object is never re-checked against the 2048-char limit, so a
        // near-boundary payload could sail past the cap and get rejected
        // server-side by `trackEventSchema`'s refine, silently dropping the
        // event. The event itself is just a discrete "identify happened"
        // marker so it flushes promptly.
        const event: TrackEvent = {
          eventId: generateUuid(),
          type: "identify",
          name: "identify",
          ts: Date.now(),
        };
        ctx.queue.enqueue(event);
      } catch {
        // fail-silent
      }
    },
    [ctx],
  );

  return { identify, track, page, milestone, step };
}
