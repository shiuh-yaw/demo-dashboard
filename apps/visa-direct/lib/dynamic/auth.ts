"use client";

import {
  logout as sdkLogout,
  isSignedIn as sdkIsSignedIn,
  refreshAuth as sdkRefreshAuth,
} from "@dynamic-labs-sdk/client";
import { getClient, createSafeWrapper } from "./client";

export const isSignedIn = createSafeWrapper(sdkIsSignedIn, false);

export async function logout(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkLogout();
}

/**
 * Refresh the current user's auth data from the server.
 * Useful after wallet creation or metadata updates to sync without
 * forcing a logout/login cycle.
 */
export async function refreshAuth(): Promise<void> {
  const client = getClient();
  if (!client) return;
  await sdkRefreshAuth(client);
}
