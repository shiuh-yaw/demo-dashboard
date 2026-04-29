import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RedisLike } from "./redis-client.js";

const store = new Map<string, string>();
const zsets = new Map<string, Map<string, number>>();

const mockRedis: RedisLike & { setIfAbsent: (k: string, v: string) => Promise<boolean> } = {
  get: async (k) => store.get(k) ?? null,
  set: async (k, v) => {
    store.set(k, v);
    return "OK";
  },
  del: async (k) => (store.delete(k) ? 1 : 0),
  setIfAbsent: async (k, v) => {
    if (store.has(k)) return false;
    store.set(k, v);
    return true;
  },
  setnx: async (k, v) => {
    if (store.has(k)) return false;
    store.set(k, v);
    return true;
  },
  zadd: async (k, s, m) => {
    const set = zsets.get(k) ?? new Map<string, number>();
    set.set(m, s);
    zsets.set(k, set);
    return 1;
  },
  zrem: async (k, m) => {
    const set = zsets.get(k);
    if (!set) return 0;
    return set.delete(m) ? 1 : 0;
  },
  zrangebyscore: async (k, min, max) => {
    const set = zsets.get(k);
    if (!set) return [];
    return [...set.entries()]
      .filter(([, s]) => s >= min && s <= max)
      .map(([m]) => m);
  },
  // Not exercised by order-store tests; stubs satisfy RedisLike.
  scan: vi.fn(),
  mget: vi.fn(),
};

vi.mock("./redis-client.js", () => ({ redis: () => mockRedis }));

beforeEach(() => {
  store.clear();
  zsets.clear();
});

describe("order-store", () => {
  it("creates a new awaiting_payment record", async () => {
    const { createOrderState, readByConfirmation } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "order-1",
      cventAttendeeId: "att-1",
      cventEventId: "ev-1",
      amountDue: "499.00",
      currency: "USD",
    });
    const state = await readByConfirmation("ABC123");
    expect(state?.status).toBe("awaiting_payment");
    expect(state?.version).toBe(1);
    expect(state?.cventPostAttempts).toBe(0);
  });

  it("is idempotent: a second createOrderState call returns the existing record without overwriting", async () => {
    const { createOrderState, transition, readByConfirmation } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "order-1",
      cventAttendeeId: "att-1",
      cventEventId: "ev-1",
      amountDue: "499.00",
      currency: "USD",
    });
    // Move the record forward so we can prove a repeat createOrderState doesn't revert it.
    await transition("ABC123", ["awaiting_payment"], "checkout_ready", {
      dynamicCheckoutId: "co-1",
    });

    const result = await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "order-1",
      cventAttendeeId: "att-1",
      cventEventId: "ev-1",
      amountDue: "499.00",
      currency: "USD",
    });

    expect(result.status).toBe("checkout_ready");
    expect(result.version).toBe(2);
    const stored = await readByConfirmation("ABC123");
    expect(stored?.status).toBe("checkout_ready");
    expect(stored?.version).toBe(2);
  });

  it("advances via transition() with CAS", async () => {
    const { createOrderState, transition, readByConfirmation } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    await transition("ABC123", ["awaiting_payment"], "checkout_ready", {
      dynamicCheckoutId: "chk-1",
    });
    const state = await readByConfirmation("ABC123");
    expect(state?.status).toBe("checkout_ready");
    expect(state?.dynamicCheckoutId).toBe("chk-1");
    expect(state?.version).toBe(2);
  });

  it("rejects invalid transitions", async () => {
    const { createOrderState, transition } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    await expect(
      transition("ABC123", ["tx_in_flight"], "paid", {})
    ).rejects.toThrow(/Invalid transition/);
  });

  it("adds to active-orders set on non-terminal, removes on terminal", async () => {
    const { createOrderState, transition } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    expect([...(zsets.get("spark26:active-orders")?.keys() ?? [])]).toContain("ABC123");
    await transition("ABC123", ["awaiting_payment"], "cancelled", {});
    expect([...(zsets.get("spark26:active-orders")?.keys() ?? [])]).not.toContain("ABC123");
  });

  it("does not overwrite an existing record when the pre-check GET lies with null", async () => {
    // Reproduces the 2026-04-23 regression: the `(rsc)` Redis client returned
    // null for an order key that physically held `tx_confirmed v4` (brief
    // read-after-write inconsistency after the worker route recompiled).
    // A check-then-SET `createOrderState` would clobber the confirmed record
    // back to `awaiting_payment v1`, which then made the QStash worker's
    // subsequent `transition(tx_confirmed → paid)` fail with InvalidTransition.
    const { createOrderState, transition, readByConfirmation } = await import(
      "./order-store.js"
    );
    await createOrderState({
      confirmationNumber: "RACE1",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    await transition("RACE1", ["awaiting_payment"], "checkout_ready", {
      dynamicCheckoutId: "co1",
    });
    await transition("RACE1", ["checkout_ready"], "tx_in_flight", {
      dynamicTransactionId: "tx1",
    });
    const confirmed = await transition("RACE1", ["tx_in_flight"], "tx_confirmed", {
      txHash: "0xabc",
    });
    expect(confirmed.status).toBe("tx_confirmed");
    expect(confirmed.version).toBe(4);

    // Simulate Bug A: the very next GET lies with null even though the record
    // is actually present.
    const realGet = mockRedis.get;
    let liesLeft = 1;
    mockRedis.get = async (k) => {
      if (liesLeft > 0) {
        liesLeft -= 1;
        return null;
      }
      return realGet(k);
    };

    const result = await createOrderState({
      confirmationNumber: "RACE1",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    mockRedis.get = realGet;

    expect(result.status).toBe("tx_confirmed");
    expect(result.version).toBe(4);
    const stored = await readByConfirmation("RACE1");
    expect(stored?.status).toBe("tx_confirmed");
    expect(stored?.version).toBe(4);
  });

  it("reverse index maps checkoutId back to confirmation", async () => {
    const { createOrderState, transition, readByCheckoutId } = await import("./order-store.js");
    await createOrderState({
      confirmationNumber: "ABC123",
      cventOrderId: "o1",
      cventAttendeeId: "a1",
      cventEventId: "e1",
      amountDue: "1",
      currency: "USD",
    });
    await transition("ABC123", ["awaiting_payment"], "checkout_ready", {
      dynamicCheckoutId: "chk-1",
    });
    const byId = await readByCheckoutId("chk-1");
    expect(byId?.confirmationNumber).toBe("ABC123");
  });

  describe("updateFx", () => {
    it("writes the four FX fields and bumps version + updatedAt", async () => {
      const { createOrderState, updateFx } = await import("./order-store.js");
      const confirmation = "ABCFX1";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "order-eur",
        cventAttendeeId: "att-eur",
        cventEventId: "ev-eur",
        amountDue: "50.00",
        currency: "EUR",
      });
      const updated = await updateFx(confirmation, {
        amountDueUsd: "54.25",
        fxRate: "1.0850",
        fxSource: "coinbase",
        fxLockedAt: "2026-04-22T14:32:00.000Z",
      });
      expect(updated.amountDueUsd).toBe("54.25");
      expect(updated.fxRate).toBe("1.0850");
      expect(updated.fxSource).toBe("coinbase");
      expect(updated.fxLockedAt).toBe("2026-04-22T14:32:00.000Z");
      expect(updated.version).toBe(2);
      expect(updated.status).toBe("awaiting_payment");
    });

    it("throws when the order does not exist", async () => {
      const { updateFx } = await import("./order-store.js");
      await expect(
        updateFx("NOPE", {
          amountDueUsd: "1",
          fxRate: "1",
          fxSource: "identity",
          fxLockedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(/not created yet|not found/i);
    });

    it("retries via CAS when a concurrent transition bumps the version mid-write", async () => {
      // Reproduces I3: `updateFx` must not clobber a concurrent `transition()`
      // write. Without the CAS re-read, the second writer's spread-from-stale-
      // `current` would SET back to the earlier version's status (e.g.
      // `tx_confirmed → paid` worker would be overwritten to `tx_confirmed`).
      const { createOrderState, updateFx, readByConfirmation } = await import(
        "./order-store.js"
      );
      const confirmation = "FXRACE";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "o1",
        cventAttendeeId: "a1",
        cventEventId: "e1",
        amountDue: "50.00",
        currency: "EUR",
      });

      // Between updateFx's first read and its CAS re-read, simulate a
      // concurrent transition that bumps v=1 → v=2 and advances status.
      const realGet = mockRedis.get;
      let callCount = 0;
      mockRedis.get = async (k) => {
        callCount += 1;
        if (callCount === 2) {
          const raw = await realGet(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.version += 1;
            parsed.status = "checkout_ready";
            parsed.dynamicCheckoutId = "chk-race";
            store.set(k, JSON.stringify(parsed));
          }
        }
        return realGet(k);
      };

      const updated = await updateFx(confirmation, {
        amountDueUsd: "54.25",
        fxRate: "1.0850",
        fxSource: "coinbase",
        fxLockedAt: "2026-04-22T14:32:00.000Z",
      });
      mockRedis.get = realGet;

      // The concurrent write must be preserved, and FX fields must still land.
      expect(updated.status).toBe("checkout_ready");
      expect(updated.dynamicCheckoutId).toBe("chk-race");
      expect(updated.amountDueUsd).toBe("54.25");
      expect(updated.fxRate).toBe("1.0850");
      expect(updated.version).toBe(3);

      const stored = await readByConfirmation(confirmation);
      expect(stored?.status).toBe("checkout_ready");
      expect(stored?.amountDueUsd).toBe("54.25");
      expect(stored?.version).toBe(3);
    });

    it("throws OrderConflictError when CAS retries are exhausted", async () => {
      const { createOrderState, updateFx } = await import("./order-store.js");
      const confirmation = "FXBUSY";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "o1",
        cventAttendeeId: "a1",
        cventEventId: "e1",
        amountDue: "50.00",
        currency: "EUR",
      });

      // Every read bumps the stored version so CAS re-read never matches.
      const realGet = mockRedis.get;
      mockRedis.get = async (k) => {
        const raw = await realGet(k);
        if (raw && k.startsWith("spark26:order:")) {
          const parsed = JSON.parse(raw);
          parsed.version += 1;
          store.set(k, JSON.stringify(parsed));
        }
        return raw;
      };

      await expect(
        updateFx(confirmation, {
          amountDueUsd: "54.25",
          fxRate: "1.0850",
          fxSource: "coinbase",
          fxLockedAt: "2026-04-22T14:32:00.000Z",
        }),
      ).rejects.toThrow(/modified concurrently/i);
      mockRedis.get = realGet;
    });

    it("refreshes ACTIVE_SET score to the new updatedAt", async () => {
      const { createOrderState, updateFx } = await import("./order-store.js");
      const confirmation = "FXZSCORE";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "o1",
        cventAttendeeId: "a1",
        cventEventId: "e1",
        amountDue: "50.00",
        currency: "EUR",
      });
      const scoreBefore = zsets.get("spark26:active-orders")?.get(confirmation);
      expect(scoreBefore).toBeDefined();

      // Sleep long enough that the new updatedAt ms is strictly greater.
      await new Promise((r) => setTimeout(r, 2));

      await updateFx(confirmation, {
        amountDueUsd: "54.25",
        fxRate: "1.0850",
        fxSource: "coinbase",
        fxLockedAt: new Date().toISOString(),
      });
      const scoreAfter = zsets.get("spark26:active-orders")?.get(confirmation);
      expect(scoreAfter).toBeDefined();
      expect(scoreAfter!).toBeGreaterThan(scoreBefore!);
    });
  });

  describe("upsertFromCvent", () => {
    it("retries via CAS when a concurrent transition bumps the version", async () => {
      const { createOrderState, upsertFromCvent, readByConfirmation } =
        await import("./order-store.js");
      const confirmation = "UPRACE";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "o1",
        cventAttendeeId: "a1",
        cventEventId: "e1",
        amountDue: "50.00",
        currency: "EUR",
      });

      const realGet = mockRedis.get;
      let callCount = 0;
      mockRedis.get = async (k) => {
        callCount += 1;
        // Reads inside casWrite are CAS re-reads (even-numbered after the
        // outer `before` read). Lie on the 3rd overall read (2nd casWrite
        // read) by bumping version to force a retry.
        if (callCount === 3) {
          const raw = await realGet(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.version += 1;
            parsed.status = "checkout_ready";
            store.set(k, JSON.stringify(parsed));
          }
        }
        return realGet(k);
      };

      const updated = await upsertFromCvent(confirmation, {
        amountDue: "75.00",
        currency: "EUR",
      });
      mockRedis.get = realGet;

      expect(updated.status).toBe("checkout_ready");
      expect(updated.amountDue).toBe("75.00");
      expect(updated.version).toBe(3);

      const stored = await readByConfirmation(confirmation);
      expect(stored?.amountDue).toBe("75.00");
      expect(stored?.status).toBe("checkout_ready");
    });

    it("refreshes ACTIVE_SET score on write", async () => {
      const { createOrderState, upsertFromCvent } = await import(
        "./order-store.js"
      );
      const confirmation = "UPZSCORE";
      await createOrderState({
        confirmationNumber: confirmation,
        cventOrderId: "o1",
        cventAttendeeId: "a1",
        cventEventId: "e1",
        amountDue: "50.00",
        currency: "EUR",
      });
      const scoreBefore = zsets.get("spark26:active-orders")?.get(confirmation);
      await new Promise((r) => setTimeout(r, 2));
      await upsertFromCvent(confirmation, {
        amountDue: "60.00",
        currency: "EUR",
      });
      const scoreAfter = zsets.get("spark26:active-orders")?.get(confirmation);
      expect(scoreAfter!).toBeGreaterThan(scoreBefore!);
    });
  });
});

describe("withLock", () => {
  it("blocks a second caller while the first holds the lock", async () => {
    const { withLock } = await import("./order-store.js");
    const order: string[] = [];
    const p1 = withLock("ABC123", async () => {
      order.push("start-1");
      await new Promise((r) => setTimeout(r, 10));
      order.push("end-1");
    });
    await new Promise((r) => setTimeout(r, 1));
    await expect(
      withLock("ABC123", async () => order.push("start-2"))
    ).rejects.toThrow(/Could not acquire lock/);
    await p1;
    expect(order).toEqual(["start-1", "end-1"]);
  });
});
