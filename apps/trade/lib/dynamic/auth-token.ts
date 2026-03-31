"use client";

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * Get the current user's JWT for authenticated API calls.
 * Waits for client initialization if needed.
 */
export async function getAuthToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  await sdkWaitForClientInitialized(client);
  return (client as { token?: string | null }).token ?? null;
}
