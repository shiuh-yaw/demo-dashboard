"use client";

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export type InitStatus = "uninitialized" | "in-progress" | "finished" | "failed";

export function getInitStatus(): InitStatus {
  const client = getClient();
  if (!client) return "uninitialized";
  return client.initStatus as InitStatus;
}

export async function waitForClientInitialized(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkWaitForClientInitialized(client);
}
