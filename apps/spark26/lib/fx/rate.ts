import { fetchCoinbaseRate } from "./coinbase.js";
import { computeAmountDueUsd } from "./compute.js";
import { redis } from "@/lib/store/redis-client";
import { updateFx } from "@/lib/store/order-store";
import type { OrderState } from "@/lib/types/order-state";

export type LockedRate = {
  rate: number;
  source: "coinbase" | "cache" | "identity";
  fetchedAt: string; // ISO timestamp
};

export class FxUnavailableError extends Error {
  constructor(base: string, cause?: unknown) {
    super(`FX rate unavailable for ${base}`);
    this.name = "FxUnavailableError";
    if (cause instanceof Error) this.cause = cause;
  }
}

const CACHE_KEY = (base: string) => `spark26:fx:rate:${base}`;
const CACHE_TTL_SECONDS = 60;
const STALE_FALLBACK_MS = 5 * 60_000;

type CacheEntry = { rate: number; fetchedAt: string };

export async function lockRate(base: string): Promise<LockedRate> {
  if (base === "USD") {
    return { rate: 1, source: "identity", fetchedAt: new Date().toISOString() };
  }
  try {
    const rate = await fetchCoinbaseRate(base);
    const fetchedAt = new Date().toISOString();
    const entry: CacheEntry = { rate, fetchedAt };
    try {
      await redis().set(CACHE_KEY(base), JSON.stringify(entry), "EX", CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      console.warn(
        `[spark26][fx] lockRate: cache write failed for ${base}, returning live rate anyway`,
        cacheErr,
      );
    }
    return { rate, source: "coinbase", fetchedAt };
  } catch (err) {
    const fallback = await readFallback(base);
    if (fallback) return { ...fallback, source: "cache" };
    throw new FxUnavailableError(base, err);
  }
}

async function readFallback(base: string): Promise<CacheEntry | null> {
  const raw = await redis().get(CACHE_KEY(base));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.rate !== "number" ||
      !Number.isFinite(parsed.rate) ||
      typeof parsed?.fetchedAt !== "string"
    ) {
      return null;
    }
    const age = Date.now() - Date.parse(parsed.fetchedAt);
    if (!Number.isFinite(age) || age > STALE_FALLBACK_MS) return null;
    return parsed;
  } catch (err) {
    console.error(`[spark26][fx] readFallback: corrupt cache entry for ${base}`, err);
    return null;
  }
}

// Locks FX on an order if it doesn't already have a rate. No-ops if:
//  - FX fields are already present (respecting the "lock once per session" rule)
//  - amountDue is 0 (comped attendee — no payment, no FX needed)
//
// On FxUnavailableError, logs and returns the order unchanged. This keeps the
// page render path resilient: the user sees EUR amount only, clicks Start,
// createCheckoutAction retries the lock with its own error handling.
export async function lockFxIfMissing(order: OrderState): Promise<OrderState> {
  if (order.amountDueUsd && order.fxRate && order.fxSource) return order;
  const amountCents = Number.parseFloat(order.amountDue);
  if (!Number.isFinite(amountCents) || amountCents === 0) return order;
  try {
    const locked = await lockRate(order.currency);
    const amountDueUsd = computeAmountDueUsd(order.amountDue, locked.rate);
    return await updateFx(order.confirmationNumber, {
      amountDueUsd,
      fxRate: locked.rate.toFixed(4),
      fxSource: locked.source,
      fxLockedAt: locked.fetchedAt,
    });
  } catch (err) {
    if (err instanceof FxUnavailableError) {
      console.warn(
        `[spark26][fx] lockFxIfMissing: resolver-side lock failed for ${order.confirmationNumber}; user will retry at Start time`,
        err,
      );
      return order;
    }
    throw err;
  }
}
