"use client";

/**
 * Reactively exposes the raw Dynamic client user (or null) so the shared
 * `useIdentify` primitive (@dynamic-demos/analytics) can
 * resolve identity from it - mirrors `apps/wallet`'s
 * `useAuthenticatedIdentity` subscription pattern, except resolution itself
 * (email extraction) stays inside the shared package rather than being
 * duplicated here.
 *
 * Value-cached by id/email so `useSyncExternalStore` sees a stable
 * reference across ticks when nothing person-level changed (same
 * precaution as wallet's `getAuthenticatedIdentity`).
 */

import { useSyncExternalStore } from "react";
import { onEvent } from "@/lib/dynamic";
import { getClient } from "@/lib/dynamic/client";

type ClientUser = NonNullable<ReturnType<typeof getClient>>["user"];

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

let cachedUser: ClientUser | null = null;

function getSnapshot(): ClientUser | null {
  const user = getClient()?.user ?? null;
  if (!user) {
    cachedUser = null;
    return null;
  }
  if (
    cachedUser &&
    cachedUser.id === user.id &&
    (cachedUser.email ?? null) === (user.email ?? null)
  ) {
    return cachedUser;
  }
  cachedUser = user;
  return cachedUser;
}

function getServerSnapshot(): ClientUser | null {
  return null;
}

export function useAuthenticatedUser(): ClientUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
