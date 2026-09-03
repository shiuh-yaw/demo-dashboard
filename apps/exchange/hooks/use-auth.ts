"use client";

import { useSyncExternalStore } from "react";
import { isSignedIn, onEvent } from "@/lib/dynamic";

const AUTH_EVENTS = ["userChanged", "walletAccountsChanged", "logout", "initStatusChanged"] as const;

function subscribe(callback: () => void): () => void {
  const unsubscribes = AUTH_EVENTS.map((event) => onEvent({ event, listener: callback }));
  return () => unsubscribes.forEach((u) => u?.());
}

/** Reactive Dynamic auth state (live mode only). */
export function useAuth(): boolean {
  return useSyncExternalStore(subscribe, () => isSignedIn(), () => false);
}
