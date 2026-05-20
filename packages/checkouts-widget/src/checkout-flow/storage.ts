"use client";

/**
 * Persistent storage for the in-flight Checkout Flow transaction id.
 *
 * Mirrors the official `apps/checkout-demo`'s `createCheckoutStorage`
 * helper: on a page reload, the widget can call
 * `getCheckoutTransaction({ transactionId })` to restore the user's
 * existing transaction instead of starting over.
 *
 * Scoped per Dynamic env id so two demos using different env ids don't
 * collide. Falls back to in-memory when window is unavailable (SSR / tests).
 */

import { z } from "zod";

const STORAGE_KEY_PREFIX = "checkouts:flow-state:";

const checkoutStateSchema = z.object({
  transactionId: z.string().min(1),
});

export type PersistedCheckoutState = z.infer<typeof checkoutStateSchema>;

export interface CheckoutStorage {
  clear: () => void;
  get: () => PersistedCheckoutState | null;
  set: (state: PersistedCheckoutState) => void;
}

const getLocalStorage = (): Storage | null =>
  typeof window === "undefined" ? null : window.localStorage;

export function createCheckoutStorage(envId: string): CheckoutStorage {
  const key = `${STORAGE_KEY_PREFIX}${envId}`;

  return {
    clear(): void {
      getLocalStorage()?.removeItem(key);
    },
    get(): PersistedCheckoutState | null {
      const raw = getLocalStorage()?.getItem(key);
      if (!raw) return null;
      try {
        return checkoutStateSchema.parse(JSON.parse(raw));
      } catch {
        // Corrupt entry — clear so subsequent reads return null cleanly.
        getLocalStorage()?.removeItem(key);
        return null;
      }
    },
    set(state: PersistedCheckoutState): void {
      getLocalStorage()?.setItem(key, JSON.stringify(state));
    },
  };
}
