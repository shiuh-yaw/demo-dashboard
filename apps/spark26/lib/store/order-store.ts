import type { OrderState, OrderStatus } from "@/lib/types/order-state.js";
import { isTerminal, InvalidTransitionError, OrderConflictError } from "@/lib/types/order-state.js";
import { redis } from "./redis-client.js";

const ORDER_KEY = (c: string) => `spark26:order:${c}`;
const CHECKOUT_INDEX = (id: string) => `spark26:checkoutId:${id}`;
const ACTIVE_SET = "spark26:active-orders";

// Snip a stack trace down to a few frames so "invariant violation" log lines
// (createOrderState NX-race, transition REJECT) tell us which caller path got
// us there. Kept lightweight so it's cheap to leave enabled in prod.
function callerTrace(): string {
  const raw = new Error("trace").stack ?? "";
  return raw
    .split("\n")
    .slice(2, 6)
    .map((l) => l.trim().replace(/^at /, ""))
    .join(" ← ");
}

export async function readByConfirmation(confirmation: string): Promise<OrderState | null> {
  const raw = await redis().get(ORDER_KEY(confirmation));
  if (!raw) return null;
  return JSON.parse(raw) as OrderState;
}

export async function readByCheckoutId(checkoutId: string): Promise<OrderState | null> {
  const confirmation = await redis().get(CHECKOUT_INDEX(checkoutId));
  if (!confirmation) return null;
  return readByConfirmation(confirmation);
}

type CreateArgs = {
  confirmationNumber: string;
  cventOrderId: string;
  cventAttendeeId: string;
  cventEventId: string;
  amountDue: string;
  currency: string;
  attendeeName?: string;
};

export async function createOrderState(args: CreateArgs): Promise<OrderState> {
  // Idempotent via atomic SET NX. The store's invariant is that the state
  // machine only moves forward — a check-then-SET can clobber `tx_confirmed`
  // back to `awaiting_payment` if the pre-check GET returns a stale null (as
  // happened on 2026-04-23 when the `(rsc)` Redis client read null for an
  // order key that physically held tx_confirmed v4; the worker's postback
  // then saw `awaiting_payment` on its CAS re-read and rejected the transition
  // to paid). Using SET NX makes the write atomic with the existence check,
  // so any concurrent writer — or any stale null GET from the REST gateway —
  // is guaranteed to lose to whatever is already in Redis.
  const now = new Date().toISOString();
  const state: OrderState = {
    version: 1,
    status: "awaiting_payment",
    settlementChain: "base",
    settlementAsset: "USDC",
    cventPostAttempts: 0,
    createdAt: now,
    updatedAt: now,
    ...args,
  };
  const wrote = await redis().setIfAbsent(
    ORDER_KEY(args.confirmationNumber),
    JSON.stringify(state),
  );
  if (!wrote) {
    // NX refused → Redis server confirms the key exists. Read it back so we
    // can return the current state. With the globalThis-pinned Upstash
    // client (see redis-client.ts), the SDK's read-your-writes sync token
    // makes this read strongly consistent with the write that claimed the
    // slot. A tiny retry stays in place as a belt-and-suspenders for the
    // rare cross-process case where the sync token can't be preserved.
    let existingRaw = await redis().get(ORDER_KEY(args.confirmationNumber));
    if (!existingRaw) {
      await new Promise((r) => setTimeout(r, 100));
      existingRaw = await redis().get(ORDER_KEY(args.confirmationNumber));
    }
    if (!existingRaw) {
      throw new Error(
        `createOrderState: SET NX refused but key unreadable for ${args.confirmationNumber}`,
      );
    }
    const existing = JSON.parse(existingRaw) as OrderState;
    console.warn(
      `[spark26][store] createOrderState: lost NX race for ${args.confirmationNumber}, returning existing status=${existing.status} v${existing.version} | caller=${callerTrace()}`,
    );
    return existing;
  }
  console.info(
    `[spark26][store] createOrderState: new record for ${args.confirmationNumber}`,
  );
  await redis().zadd(ACTIVE_SET, Date.parse(now), args.confirmationNumber);
  return state;
}

export async function transition(
  confirmation: string,
  expected: readonly OrderStatus[],
  next: OrderStatus,
  patch: Partial<OrderState>
): Promise<OrderState> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await readByConfirmation(confirmation);
    if (!current) throw new Error(`Order ${confirmation} not found`);
    if (!expected.includes(current.status)) {
      console.warn(
        `[spark26][store] transition REJECT ${confirmation}: expected ∈ [${expected.join(",")}], got ${current.status}, attempted next=${next} | caller=${callerTrace()}`,
      );
      throw new InvalidTransitionError(current.status, next, expected);
    }
    console.info(
      `[spark26][store] transition ${confirmation}: ${current.status} → ${next} (version ${current.version})`,
    );
    const updated: OrderState = {
      ...current,
      ...patch,
      status: next,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      ...(next === "paid" ? { paidAt: new Date().toISOString() } : {}),
    };
    const storedRaw = await redis().get(ORDER_KEY(confirmation));
    const stored = storedRaw ? (JSON.parse(storedRaw) as OrderState) : null;
    if (stored?.version !== current.version) continue;
    await redis().set(ORDER_KEY(confirmation), JSON.stringify(updated));

    if (patch.dynamicCheckoutId) {
      await redis().set(CHECKOUT_INDEX(patch.dynamicCheckoutId), confirmation);
    }
    if (isTerminal(next)) {
      await redis().zrem(ACTIVE_SET, confirmation);
    } else {
      await redis().zadd(ACTIVE_SET, Date.parse(updated.updatedAt), confirmation);
    }
    return updated;
  }
  throw new OrderConflictError(confirmation);
}

// Shared CAS-and-ACTIVE_SET write for non-status-changing patches. Mirrors
// the guarantees transition() provides: read-compute-write retries on
// version mismatch, and the ACTIVE_SET score is kept in sync with
// `updatedAt` so reconcile's staleness filter stays honest. Callers with
// a status-gated transition should use transition() instead.
async function casWrite(
  confirmation: string,
  patch: Partial<OrderState>,
  logLabel: string,
): Promise<OrderState> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const current = await readByConfirmation(confirmation);
    if (!current) throw new Error(`Order ${confirmation} not created yet`);
    const updated: OrderState = {
      ...current,
      ...patch,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    const storedRaw = await redis().get(ORDER_KEY(confirmation));
    const stored = storedRaw ? (JSON.parse(storedRaw) as OrderState) : null;
    if (stored?.version !== current.version) {
      console.warn(
        `[spark26][store] ${logLabel} CAS miss ${confirmation}: read v${current.version}, stored v${stored?.version ?? "null"} — retrying`,
      );
      continue;
    }
    await redis().set(ORDER_KEY(confirmation), JSON.stringify(updated));
    if (!isTerminal(updated.status)) {
      await redis().zadd(ACTIVE_SET, Date.parse(updated.updatedAt), confirmation);
    }
    return updated;
  }
  throw new OrderConflictError(confirmation);
}

export async function upsertFromCvent(
  confirmation: string,
  patch: Partial<OrderState> & { currency: string; amountDue: string }
): Promise<OrderState> {
  const before = await readByConfirmation(confirmation);
  if (!before) throw new Error(`Order ${confirmation} not created yet`);
  console.info(
    `[spark26][store] upsertFromCvent ${confirmation}: status=${before.status} v${before.version} patch-keys=${Object.keys(patch).join(",")}`,
  );
  return casWrite(confirmation, patch, "upsertFromCvent");
}

export async function updateFx(
  confirmation: string,
  fx: {
    amountDueUsd: string;
    fxRate: string;
    fxSource: "coinbase" | "cache" | "identity";
    fxLockedAt: string;
  },
): Promise<OrderState> {
  return casWrite(confirmation, fx, "updateFx");
}

export async function withLock<T>(
  confirmation: string,
  fn: () => Promise<T>
): Promise<T> {
  const key = `spark26:lock:${confirmation}`;
  const token = crypto.randomUUID();
  const ok = await redis().setnx(key, token, 5);
  if (!ok) throw new Error(`Could not acquire lock for ${confirmation}`);
  try {
    return await fn();
  } finally {
    await redis().del(key);
  }
}

export async function listStaleActiveOrders(olderThanMs: number): Promise<string[]> {
  const cutoff = Date.now() - olderThanMs;
  return redis().zrangebyscore(ACTIVE_SET, 0, cutoff);
}
