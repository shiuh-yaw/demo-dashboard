"use client";

/**
 * Auth state + sign out.
 *
 * @see https://www.dynamic.xyz/docs/javascript/user-session-management
 */

import {
  isSignedIn as sdkIsSignedIn,
  logout as sdkLogout,
  refreshAuth as sdkRefreshAuth,
} from "@dynamic-labs-sdk/client";
import { resolveUserEmail } from "@dynamic-demos/analytics";
import { getClient, createSafeWrapper } from "./client";

/** Is a user signed in? False during SSR. */
export const isSignedIn = createSafeWrapper(sdkIsSignedIn, false);

/** Sign out. Safe to call when already signed out. */
export async function logout(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkLogout();
}

/**
 * Re-hydrate the local session from the server.
 *
 * Business-account operations mutate server-side wallet ownership (a linked
 * wallet's `businessAccountId` is set and its `userId` cleared), so the
 * session's cached user goes stale after them. The SDK calls this itself
 * inside `addWalletToBusinessAccount` / `createWalletForBusinessAccount`;
 * this app calls it on mount so a returning session starts fresh.
 */
export async function refreshAuth(): Promise<unknown> {
  const client = getClient();
  if (!client) return undefined;
  return sdkRefreshAuth(client);
}

/** Person-level identity of the authenticated user, any auth method. */
export interface AuthenticatedIdentity {
  /** Dynamic user id - stable canonical key (this demo's own env, per D-004). */
  dynamicUserId: string;
  /** Verified email when present (email OTP, social); null otherwise. */
  email: string | null;
}

// Value-cached so useSyncExternalStore sees a stable reference across ticks.
let identityCache: AuthenticatedIdentity | null = null;

/** Authenticated identity, or null when signed out / client not ready. */
export function getAuthenticatedIdentity(): AuthenticatedIdentity | null {
  const user = getClient()?.user;
  if (!user?.id) {
    identityCache = null;
    return null;
  }
  // Shared resolver so email extraction is identical across demos.
  const email = resolveUserEmail(user) ?? null;
  if (
    identityCache?.dynamicUserId === user.id &&
    identityCache.email === email
  ) {
    return identityCache;
  }
  identityCache = { dynamicUserId: user.id, email };
  return identityCache;
}

/** The signed-in user's Dynamic user id, or null. */
export function getCurrentUserId(): string | null {
  return getClient()?.user?.id ?? null;
}
