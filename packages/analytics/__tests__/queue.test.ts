import { afterEach, describe, expect, it, vi } from "vitest";
import { EventQueue, type EventQueueMeta } from "../src/queue";
import type { TrackEvent } from "../src/schema";

const meta: EventQueueMeta = {
  sessionId: "22222222-2222-4222-8222-222222222222",
  anonId: "33333333-3333-4333-8333-333333333333",
  demoSlug: "wallet",
};

function makeEvent(name: string): TrackEvent {
  return {
    eventId: crypto.randomUUID(),
    type: "pageview",
    name,
    ts: Date.now(),
  };
}

/** Drain the microtask queue a handful of times - enough for a few chained `await`s. */
async function flushMicrotasks(times = 10): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("EventQueue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("no-ops entirely when trackUrl is unset", async () => {
    const fetchImpl = vi.fn();
    const queue = new EventQueue({ getMeta: () => meta, fetchImpl });
    queue.enqueue(makeEvent("pageview"));
    await flushMicrotasks();
    expect(fetchImpl).not.toHaveBeenCalled();
    queue.destroy();
  });

  it("flushes immediately once batchSize is reached", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 3,
      flushIntervalMs: 60_000,
    });

    queue.enqueue(makeEvent("a"));
    queue.enqueue(makeEvent("b"));
    expect(fetchImpl).not.toHaveBeenCalled();
    queue.enqueue(makeEvent("c"));

    // The fetch call itself is issued synchronously inside enqueue -> flush -> send.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://track.example.com/api/events");
    expect(init.keepalive).toBe(true);
    const body = JSON.parse(init.body);
    expect(body.events).toHaveLength(3);
    expect(body.sessionId).toBe(meta.sessionId);

    await flushMicrotasks();
    queue.destroy();
  });

  it("flushes on the time trigger before batchSize is reached", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 20,
      flushIntervalMs: 5000,
    });

    queue.enqueue(makeEvent("a"));
    expect(fetchImpl).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.events).toHaveLength(1);

    queue.destroy();
  });

  it("retries once on failure, then drops the batch", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 1,
    });

    queue.enqueue(makeEvent("a"));
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(debugSpy).toHaveBeenCalled();

    // Buffer was dropped - a subsequent flush sends nothing new.
    fetchImpl.mockClear();
    await queue.flush();
    expect(fetchImpl).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("never throws when fetch rejects asynchronously", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 1,
    });

    expect(() => queue.enqueue(makeEvent("a"))).not.toThrow();
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    queue.destroy();
  });

  it("never throws when fetch throws synchronously (no unhandled rejection)", async () => {
    const fetchImpl = vi.fn(() => {
      throw new Error("boom - synchronous throw");
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      batchSize: 1,
    });

    expect(() => queue.enqueue(makeEvent("a"))).not.toThrow();
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("drains the buffer via navigator.sendBeacon on visibilitychange -> hidden", () => {
    const fetchImpl = vi.fn();
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 20,
      flushIntervalMs: 60_000,
    });

    queue.enqueue(makeEvent("a"));
    expect(fetchImpl).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("visibilitychange"));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0]!;
    expect(url).toBe("https://track.example.com/api/events");
    expect(blob).toBeInstanceOf(Blob);
    expect(fetchImpl).not.toHaveBeenCalled();

    queue.destroy();
  });

  it("buildBatch omits identity by default (backward-compat)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 1,
    });

    queue.enqueue(makeEvent("a"));
    await flushMicrotasks();

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect("identity" in body).toBe(false);

    queue.destroy();
  });

  it("setIdentity makes every subsequent batch include the identity", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 1,
    });

    queue.setIdentity({ userId: "u_1", email: "a@b.co" });

    queue.enqueue(makeEvent("a"));
    await flushMicrotasks();
    const first = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(first.identity).toEqual({ userId: "u_1", email: "a@b.co" });

    fetchImpl.mockClear();
    queue.enqueue(makeEvent("b"));
    await flushMicrotasks();
    const second = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(second.identity).toEqual({ userId: "u_1", email: "a@b.co" });

    queue.destroy();
  });

  it("setIdentity is last-wins and merges traits across calls", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl,
      batchSize: 1,
    });

    queue.setIdentity({ userId: "u_1", traits: { plan: "free" } });
    queue.setIdentity({ userId: "u_1", email: "a@b.co", traits: { seat: "admin" } });

    queue.enqueue(makeEvent("a"));
    await flushMicrotasks();
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body);
    expect(body.identity).toEqual({
      userId: "u_1",
      email: "a@b.co",
      traits: { plan: "free", seat: "admin" },
    });

    queue.destroy();
  });

  it("does not drain via beacon when the buffer is empty", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    const queue = new EventQueue({
      getMeta: () => meta,
      trackUrl: "https://track.example.com",
      fetchImpl: vi.fn(),
    });

    document.dispatchEvent(new Event("visibilitychange"));
    expect(sendBeacon).not.toHaveBeenCalled();

    queue.destroy();
  });
});
