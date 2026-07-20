/**
 * EventQueue - pure batching + transport layer for the GTM tracker. No React.
 *
 * Behavior (binding, see `docs/projects/gtm-platform/phases/02-analytics-package.md`):
 *   - `enqueue(event)` batches events client-side.
 *   - Flush triggers on whichever comes first: 20 events queued, or 5s elapsed.
 *   - Flush POSTs a `TrackBatch` to `${trackUrl}/api/track` with `keepalive: true`.
 *   - On `visibilitychange -> hidden`, drains the buffer via `navigator.sendBeacon`
 *     (best-effort, no retry - the page may be closing).
 *   - A failed flush retries once, then the batch is dropped. Fail-silent:
 *     nothing here ever throws into the caller.
 *   - If no `trackUrl` is configured, the queue is a total no-op (protects
 *     against unbounded memory growth when the tracker is misconfigured).
 */

import type { TrackBatch, TrackEvent } from "./schema";

export interface EventQueueMeta {
  sessionId: string;
  anonId: string;
  demoSlug: string;
  shareToken?: string;
  isInternal?: boolean;
}

export interface EventQueueOptions {
  /** Returns the current batch metadata. Called at flush time. */
  getMeta: () => EventQueueMeta;
  /** Base track URL (`NEXT_PUBLIC_TRACK_URL`). Queue no-ops when unset. */
  trackUrl?: string;
  /** Events queued before an immediate flush. Default 20. */
  batchSize?: number;
  /** Milliseconds before a time-triggered flush. Default 5000. */
  flushIntervalMs?: number;
  /** Injectable fetch, for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;

export class EventQueue {
  private buffer: TrackEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly getMeta: () => EventQueueMeta;
  private readonly trackUrl: string | undefined;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly visibilityHandler: (() => void) | null = null;

  constructor(options: EventQueueOptions) {
    this.getMeta = options.getMeta;
    this.trackUrl = options.trackUrl;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.fetchImpl =
      options.fetchImpl ??
      (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (async () => {
        throw new Error("fetch is not available");
      }));

    try {
      if (typeof document !== "undefined" && this.trackUrl) {
        this.visibilityHandler = () => {
          if (document.visibilityState === "hidden") {
            this.drainViaBeacon();
          }
        };
        document.addEventListener("visibilitychange", this.visibilityHandler);
      }
    } catch {
      // fail-silent: listener registration is best-effort
    }
  }

  /** Queue an event. No-ops entirely when `trackUrl` is unset. */
  enqueue(event: TrackEvent): void {
    try {
      if (!this.trackUrl) return;
      this.buffer.push(event);

      if (this.buffer.length >= this.batchSize) {
        void this.flush();
        return;
      }

      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.flush();
        }, this.flushIntervalMs);
      }
    } catch {
      // fail-silent
    }
  }

  /** Flush the current buffer, retrying once on failure before dropping it. */
  async flush(): Promise<void> {
    try {
      this.clearTimer();
      if (this.buffer.length === 0 || !this.trackUrl) return;

      const events = this.buffer;
      this.buffer = [];
      const batch = this.buildBatch(events);

      const ok = await this.send(batch);
      if (!ok) {
        const retryOk = await this.send(batch);
        if (!retryOk && typeof console !== "undefined" && console.debug) {
          console.debug("[analytics] dropping batch after retry failure", {
            eventCount: events.length,
          });
        }
      }
    } catch {
      // fail-silent: flush must never throw
    }
  }

  /** Cleanup: clears any pending timer and detaches the visibility listener. */
  destroy(): void {
    try {
      this.clearTimer();
      if (
        typeof document !== "undefined" &&
        this.visibilityHandler
      ) {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
      }
    } catch {
      // fail-silent
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private buildBatch(events: TrackEvent[]): TrackBatch {
    const meta = this.getMeta();
    return {
      sessionId: meta.sessionId,
      anonId: meta.anonId,
      demoSlug: meta.demoSlug,
      shareToken: meta.shareToken,
      isInternal: meta.isInternal,
      events,
    };
  }

  private async send(batch: TrackBatch): Promise<boolean> {
    try {
      if (!this.trackUrl) return false;
      const url = `${this.trackUrl.replace(/\/$/, "")}/api/track`;
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(batch),
        keepalive: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Best-effort drain via `navigator.sendBeacon` - no retry, fire-and-forget. */
  private drainViaBeacon(): void {
    try {
      if (this.buffer.length === 0 || !this.trackUrl) return;
      const events = this.buffer;
      this.buffer = [];
      this.clearTimer();

      const batch = this.buildBatch(events);
      const url = `${this.trackUrl.replace(/\/$/, "")}/api/track`;

      if (
        typeof navigator === "undefined" ||
        typeof navigator.sendBeacon !== "function"
      ) {
        return;
      }
      const blob = new Blob([JSON.stringify(batch)], {
        type: "application/json",
      });
      navigator.sendBeacon(url, blob);
    } catch {
      // fail-silent: beacon drain is best-effort on unload
    }
  }
}
