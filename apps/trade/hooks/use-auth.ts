"use client";

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
    onEvent({ event, listener: callback })
  );
  return () => unsubscribes.forEach((unsub) => unsub?.());
}

function getAuthSnapshot(): boolean {
  return isSignedIn();
}

function getAuthServerSnapshot(): boolean {
  return false;
}

export function useAuth(): boolean {
  return useSyncExternalStore(
    subscribeToAuthEvents,
    getAuthSnapshot,
    getAuthServerSnapshot
  );
}
