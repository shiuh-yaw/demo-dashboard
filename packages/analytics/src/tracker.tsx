"use client";

/**
 * <GtmTracker demoSlug> - mounts once in a demo app's root layout.
 *
 * On mount: ensures `dd_anon` (uuid, 1y), generates a per-tab `sessionId`
 * (sessionStorage), reads `?share=` / `?internal=1` into cookies, and emits
 * the initial pageview. Subscribes to route changes (`usePathname`) for
 * subsequent pageviews, and runs a 15s heartbeat while the tab is visible.
 *
 * Fail-silent by construction: every code path here is wrapped so a thrown
 * error (bad env, blocked cookies, SSR quirks) never reaches the consuming
 * app's render tree. `useTrack()` calls outside this provider are no-ops,
 * not errors - see `use-track.ts`.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { EventQueue, type EventQueueMeta } from "./queue";
import {
  ensureAnonId,
  generateUuid,
  getIsInternal,
  getShareToken,
  syncInternalCookie,
  syncShareCookie,
} from "./cookies";
import type { TrackEvent } from "./schema";

const SESSION_STORAGE_KEY = "dd_session_id";
const HEARTBEAT_INTERVAL_MS = 15000;

export interface GtmTrackerContextValue {
  queue: EventQueue;
  demoSlug: string;
}

const GtmTrackerContext = createContext<GtmTrackerContextValue | null>(null);

/** Internal - consumed by `use-track.ts`. Not part of the public surface. */
export function useGtmTrackerContext(): GtmTrackerContextValue | null {
  return useContext(GtmTrackerContext);
}

function readSessionId(): string {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return generateUuid();
    }
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = generateUuid();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return generateUuid();
  }
}

function makePageviewEvent(name: string, path: string | null): TrackEvent {
  const event: TrackEvent = {
    eventId: generateUuid(),
    type: "pageview",
    name,
    ts: Date.now(),
  };
  if (path) event.path = path;
  return event;
}

export interface GtmTrackerProps {
  /** Demo slug reported with every event (e.g. `"wallet"`). */
  demoSlug: string;
  /**
   * Extension point for a future enrichment-provider pixel (post-v1).
   * Rendered after tracker init, adjacent to `children` - not part of it.
   */
  pixelSlot?: ReactNode;
  children?: ReactNode;
}

export function GtmTracker({ demoSlug, pixelSlot, children }: GtmTrackerProps) {
  const pathname = usePathname();
  const [contextValue, setContextValue] =
    useState<GtmTrackerContextValue | null>(null);
  const metaRef = useRef<EventQueueMeta | null>(null);
  const lastTrackedPathRef = useRef<string | null | undefined>(undefined);

  // Mount-once init: cookies, session id, queue construction, initial
  // pageview, heartbeat.
  useEffect(() => {
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let queue: EventQueue | undefined;

    try {
      const trackUrl =
        typeof process !== "undefined"
          ? process.env.NEXT_PUBLIC_TRACK_URL
          : undefined;

      const anonId = ensureAnonId();
      const sessionId = readSessionId();

      let shareToken: string | undefined;
      let isInternal = false;
      try {
        const search =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();
        shareToken = syncShareCookie(search) ?? getShareToken();
        isInternal = syncInternalCookie(search) || getIsInternal();
      } catch {
        shareToken = getShareToken();
        isInternal = getIsInternal();
      }

      const meta: EventQueueMeta = {
        sessionId,
        anonId,
        demoSlug,
        shareToken,
        isInternal,
      };
      metaRef.current = meta;

      queue = new EventQueue({
        getMeta: () => metaRef.current ?? meta,
        trackUrl,
      });

      setContextValue({ queue, demoSlug });

      lastTrackedPathRef.current = pathname ?? null;
      queue.enqueue(makePageviewEvent("pageview", pathname ?? null));

      heartbeat = setInterval(() => {
        try {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "visible"
          ) {
            queue?.enqueue(makePageviewEvent("heartbeat", null));
          }
        } catch {
          // fail-silent
        }
      }, HEARTBEAT_INTERVAL_MS);
    } catch {
      // fail-silent: tracker init must never throw into the app
    }

    return () => {
      try {
        if (heartbeat) clearInterval(heartbeat);
        queue?.destroy();
      } catch {
        // fail-silent
      }
    };
    // demoSlug intentionally the only dep - mount-once init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoSlug]);

  // Route-change pageviews.
  useEffect(() => {
    try {
      if (!contextValue) return;
      if (lastTrackedPathRef.current === pathname) return;
      lastTrackedPathRef.current = pathname ?? null;
      contextValue.queue.enqueue(makePageviewEvent("pageview", pathname ?? null));
    } catch {
      // fail-silent
    }
  }, [pathname, contextValue]);

  return (
    <GtmTrackerContext.Provider value={contextValue}>
      {children}
      {pixelSlot}
    </GtmTrackerContext.Provider>
  );
}
