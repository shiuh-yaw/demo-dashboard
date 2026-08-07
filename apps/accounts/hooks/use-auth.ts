"use client";

/**
 * Reactively tracks Dynamic auth state via `useSyncExternalStore` over the
 * SDK's own events - no polling.
 */

import { useSyncExternalStore } from "react";
import { isSignedIn, onEvent } from "@/lib/dynamic";

const AUTH_EVENTS = [
  "userChanged",
  "walletAccountsChanged",
  "logout",
  "initStatusChanged",
] as const;

function subscribeToAuthEvents(callback: () => void): () => void {
  const unsubscribes = AUTH_EVENTS.map((event) =>
    onEvent({ event, listener: callback }),
  );
  return () => unsubscribes.forEach((unsub) => unsub?.());
}

export function useAuth(): boolean {
  return useSyncExternalStore(
    subscribeToAuthEvents,
    () => isSignedIn(),
    () => false,
  );
}
