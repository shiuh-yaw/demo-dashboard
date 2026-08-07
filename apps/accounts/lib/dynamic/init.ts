"use client";

/**
 * Client initialization status.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/initialize-dynamic-client
 */

import { waitForClientInitialized as sdkWaitForClientInitialized } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export type InitStatus =
  | "uninitialized"
  | "in-progress"
  | "finished"
  | "failed";

/** Current init status; "uninitialized" during SSR. */
export function getInitStatus(): InitStatus {
  const client = getClient();
  if (!client) return "uninitialized";
  return client.initStatus as InitStatus;
}

/** Resolve once the client has finished initializing. */
export async function waitForClientInitialized(): Promise<void> {
  const client = getClient();
  if (!client) return;
  return sdkWaitForClientInitialized(client);
}
