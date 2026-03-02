"use client";

/**
 * Prepaid card demo state for SE demos.
 * Stored in localStorage, random init (333–3333), resettable with payout demo.
 * Add Funds: user selects amount from balance → add to card balance.
 */

const STORAGE_KEY = "earn-demo-prepaid-balance";

function randomBetween(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

/** Initial balance when none stored (333–3333). */
export function getDefaultPrepaidBalance(): number {
  return randomBetween(333, 3333);
}

/** Deterministic for SSR / first paint to avoid hydration mismatch. */
export function getSSRSafePrepaidBalance(): number {
  return 0;
}

export function loadPrepaidBalance(): number {
  if (typeof window === "undefined") return getDefaultPrepaidBalance();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultPrepaidBalance();
      savePrepaidBalance(initial);
      return initial;
    }
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {
    // ignore
  }
  const initial = getDefaultPrepaidBalance();
  savePrepaidBalance(initial);
  return initial;
}

function savePrepaidBalance(value: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

/** Add funds: add amount to card balance. */
export function addFundsToPrepaid(currentBalance: number, amount: number): number {
  const next = Number((currentBalance + amount).toFixed(2));
  savePrepaidBalance(next);
  return next;
}

/** Reset to random 333–3333. */
export function resetPrepaidBalance(): number {
  const next = getDefaultPrepaidBalance();
  savePrepaidBalance(next);
  return next;
}

export { STORAGE_KEY as PREPAID_STORAGE_KEY };
