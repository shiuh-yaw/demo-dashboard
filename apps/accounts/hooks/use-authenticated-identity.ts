"use client";

/**
 * Reactively tracks the authenticated user's identity (Dynamic user id +
 * verified email) across every auth method. Mirrors `use-auth`'s subscription
 * so the value flows in when the SDK populates the user, which can lag the
 * `isSignedIn` flip (social login).
 */

import { useSyncExternalStore } from "react";
import {
  getAuthenticatedIdentity,
  onEvent,
  type AuthenticatedIdentity,
} from "@/lib/dynamic";

const AUTH_EVENTS = [
  "userChanged",
  "walletAccountsChanged",
  "logout",
  "initStatusChanged",
] as const;

function subscribe(callback: () => void): () => void {
  const unsubscribes = AUTH_EVENTS.map((event) =>
    onEvent({ event, listener: callback }),
  );
  return () => unsubscribes.forEach((unsub) => unsub?.());
}

export function useAuthenticatedIdentity(): AuthenticatedIdentity | null {
  return useSyncExternalStore(
    subscribe,
    () => getAuthenticatedIdentity(),
    () => null,
  );
}
