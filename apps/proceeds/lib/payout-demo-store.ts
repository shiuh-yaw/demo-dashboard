"use client";

/**
 * Persists the state of demo monthly payouts so the on-chain settlement hash
 * survives reloads. When the presenter clicks "Pay out now" on a month, we
 * mint USDC to the developer's wallet and record the tx hash here — the month
 * then renders as "paid" with a real Basescan link.
 *
 * Shape is designed to plug directly into `useSyncExternalStore`: a stable
 * cached snapshot that is only replaced when the underlying store mutates,
 * and a subscribe function that fires listeners on mutation or cross-tab
 * storage events.
 */

const STORAGE_KEY = "proceeds.payout-demo.v1";

export interface PayoutDemoRecord {
  monthKey: string;
  settlementHash: string;
  paidAt: string; // ISO date
  amountUsdc: number;
}

export type PayoutDemoSnapshot = Readonly<Record<string, PayoutDemoRecord>>;

const EMPTY_SNAPSHOT: PayoutDemoSnapshot = Object.freeze({});

let cachedSnapshot: PayoutDemoSnapshot | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): PayoutDemoSnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_SNAPSHOT;
    return Object.freeze(parsed as Record<string, PayoutDemoRecord>);
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function writeToStorage(next: PayoutDemoSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

/** Snapshot accessor for `useSyncExternalStore` (client + server). */
export function getPayoutDemoSnapshot(): PayoutDemoSnapshot {
  if (cachedSnapshot === null) {
    cachedSnapshot = readFromStorage();
  }
  return cachedSnapshot;
}

/** Subscribe to cache mutations; returns an unsubscribe fn. */
export function subscribePayoutDemo(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    // Invalidate cache so the next snapshot read reflects cross-tab changes.
    cachedSnapshot = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getPayoutDemoRecord(
  monthKey: string,
): PayoutDemoRecord | null {
  return getPayoutDemoSnapshot()[monthKey] ?? null;
}

export function setPayoutDemoRecord(record: PayoutDemoRecord) {
  const current = getPayoutDemoSnapshot();
  const next: Record<string, PayoutDemoRecord> = { ...current };
  next[record.monthKey] = record;
  cachedSnapshot = Object.freeze(next);
  writeToStorage(cachedSnapshot);
  notify();
}

export function clearPayoutDemo(monthKey?: string) {
  if (!monthKey) {
    cachedSnapshot = EMPTY_SNAPSHOT;
    writeToStorage(EMPTY_SNAPSHOT);
    notify();
    return;
  }
  const current = getPayoutDemoSnapshot();
  if (!(monthKey in current)) return;
  const next: Record<string, PayoutDemoRecord> = { ...current };
  delete next[monthKey];
  cachedSnapshot = Object.freeze(next);
  writeToStorage(cachedSnapshot);
  notify();
}
