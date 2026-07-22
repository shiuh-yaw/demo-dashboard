"use client";

/**
 * Authentication — Sign In / Sign Out
 *
 * Basic auth state checks and logout functionality.
 *
 * @see https://www.dynamic.xyz/docs/javascript/user-session-management
 */

import {
  logout as sdkLogout,
  isSignedIn as sdkIsSignedIn,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper } from "./client";

/**
 * Check if user is currently signed in.
 * Returns false during SSR or if client unavailable.
 */
export const isSignedIn = createSafeWrapper(sdkIsSignedIn, false);

/**
 * Log out the current user.
 * Safe to call even if not logged in.
 */
export async function logout(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkLogout();
}

/** Person-level identity of the authenticated user, any auth method. */
export interface AuthenticatedIdentity {
  /** Dynamic user id - stable canonical key (demo app's own env, per D-004). */
  dynamicUserId: string;
  /** Verified email when present (email OTP, social/Google); null otherwise. */
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
  const email = user.email ?? null;
  if (
    identityCache?.dynamicUserId === user.id &&
    identityCache.email === email
  ) {
    return identityCache;
  }
  identityCache = { dynamicUserId: user.id, email };
  return identityCache;
}
