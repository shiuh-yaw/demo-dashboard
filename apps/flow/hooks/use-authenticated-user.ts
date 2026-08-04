"use client";

/**
 * Reactively exposes the raw Dynamic client user (or null) so the shared
 * `useIdentify` primitive (@dynamic-demos/analytics) can
 * resolve identity from it - mirrors `apps/wallet`'s
 * `useAuthenticatedIdentity` subscription pattern, except resolution itself
 * (email extraction) stays inside the shared package rather than being
 * duplicated here.
 *
 * Flow's scenarios connect wallets with different verification levels
 * (`checkout`/`deposit` use connect-only, `verifyOnConnect={false}`;
 * `kyc-deposit`/`withdraw` verify the wallet). Only a verified session
 * populates `client.user`, so this naturally reports null for the
 * connect-only flows and only fires the milestone where the SDK actually
 * has a person-level identity.
 *
 * Value-cached by id/email so `useSyncExternalStore` sees a stable
 * reference across ticks when nothing person-level changed (same
 * precaution as wallet's `getAuthenticatedIdentity`).
 */

import { useSyncExternalStore } from "react";
import { onEvent } from "@/lib/dynamic/flow-sdk";
import { getDynamicClient } from "@/lib/dynamic/client";

type ClientUser = NonNullable<ReturnType<typeof getDynamicClient>>["user"];

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
  const user = getDynamicClient()?.user ?? null;
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
