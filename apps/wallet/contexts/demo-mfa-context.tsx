"use client";

/**
 * Demo-only toggle: force the 2FA step-up on message signing, regardless of
 * the environment's MFA config. Lets a tester experience both flows without
 * changing the shared Dynamic environment. Gates sign-message only.
 *
 * Backed directly by localStorage via useSyncExternalStore - NOT a mounted
 * context - so the value survives screen transitions and transient loading
 * remounts (a provider under the app's loading gate would reset to false on
 * every refetch). All consumers and browser tabs stay in sync.
 */

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "wallet-demo-require-sign-mfa";

const listeners = new Set<() => void>();

function readValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemoMfa() {
  // Server snapshot is always false - localStorage is client-only.
  const requireSignMfa = useSyncExternalStore(subscribe, readValue, () => false);

  const setRequireSignMfa = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore - private mode / disabled storage.
    }
    // Notify same-tab consumers (the storage event only fires cross-tab).
    listeners.forEach((listener) => listener());
  }, []);

  return { requireSignMfa, setRequireSignMfa };
}
