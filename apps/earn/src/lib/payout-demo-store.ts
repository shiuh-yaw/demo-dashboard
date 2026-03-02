"use client";

/**
 * Payout demo state for SE demos.
 * Stored in localStorage, random init (<500), resettable from user menu.
 * Workflow: request available amount → amount moves to "upcoming" and we highlight it.
 */

const STORAGE_KEY = "earn-demo-payout-state";
export const HIGHLIGHT_DURATION_MS = 45_000; // ~45s so SE can show "upcoming" state

function randomBetween(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

export interface PayoutDemoState {
  availableToRequest: number;
  upcoming: number;
  fundsOnHold: number;
  lastRequestedAmount: number | null;
  lastRequestedAt: number | null;
}

export function getDefaultPayoutState(): PayoutDemoState {
  return {
    availableToRequest: randomBetween(50, 500),
    upcoming: randomBetween(50, 500),
    fundsOnHold: randomBetween(50, 500),
    lastRequestedAmount: null,
    lastRequestedAt: null,
  };
}

/** Deterministic state for SSR / first paint. Same on server and client to avoid hydration mismatch. */
export function getSSRSafeState(): PayoutDemoState {
  return {
    availableToRequest: 0,
    upcoming: 0,
    fundsOnHold: 0,
    lastRequestedAmount: null,
    lastRequestedAt: null,
  };
}

function loadState(): PayoutDemoState {
  if (typeof window === "undefined") return getDefaultPayoutState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultPayoutState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as PayoutDemoState;
    if (
      typeof parsed.availableToRequest === "number" &&
      typeof parsed.upcoming === "number" &&
      typeof parsed.fundsOnHold === "number"
    ) {
      return {
        ...getDefaultPayoutState(),
        ...parsed,
        lastRequestedAmount: parsed.lastRequestedAmount ?? null,
        lastRequestedAt: parsed.lastRequestedAt ?? null,
      };
    }
  } catch {
    // ignore
  }
  return getDefaultPayoutState();
}

function saveState(s: PayoutDemoState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** Record a payout request: move amount from available → upcoming and set highlight. */
export function recordPayoutRequest(
  state: PayoutDemoState,
  amount: number
): PayoutDemoState {
  const available = Math.max(0, state.availableToRequest - amount);
  const upcoming = state.upcoming + amount;
  const next: PayoutDemoState = {
    ...state,
    availableToRequest: Number(available.toFixed(2)),
    upcoming: Number(upcoming.toFixed(2)),
    lastRequestedAmount: amount,
    lastRequestedAt: Date.now(),
  };
  saveState(next);
  return next;
}

/** Reset to new random values. */
export function resetPayoutState(): PayoutDemoState {
  const next = getDefaultPayoutState();
  saveState(next);
  return next;
}

/** Whether we should highlight the upcoming row (recently requested). */
export function isHighlightUpcoming(
  state: PayoutDemoState,
  durationMs: number = HIGHLIGHT_DURATION_MS
): boolean {
  if (state.lastRequestedAt == null) return false;
  return Date.now() - state.lastRequestedAt < durationMs;
}

export { loadState, saveState, STORAGE_KEY };
