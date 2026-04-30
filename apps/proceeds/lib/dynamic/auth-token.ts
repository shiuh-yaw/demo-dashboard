"use client";

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export async function getAuthToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  await sdkWaitForClientInitialized(client);
  return (client as { token?: string | null }).token ?? null;
}

export function getUserName(): string | null {
  const client = getClient();
  if (!client?.user) return null;
  return client.user.firstName ?? client.user.email ?? null;
}
