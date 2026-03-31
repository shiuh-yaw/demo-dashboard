"use client";

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * JWT for authenticated deposit API routes (`getAuthenticatedUser` accepts Bearer or `dynamic_jwt` cookie).
 */
export async function getAuthToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  await sdkWaitForClientInitialized(client);
  return client.token ?? null;
}
