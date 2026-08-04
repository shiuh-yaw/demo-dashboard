"use client";

/**
 * Tracks Dynamic client initialization status, mirroring the same-named
 * hook in `apps/wallet`/`apps/deposit`/etc. Flow doesn't have a `lib/dynamic
 * /init.ts` wrapper (its `lib/dynamic/flow-sdk.ts` re-exports `onEvent`
 * directly), so this reads `client.initStatus` straight off the singleton.
 */

import { useSyncExternalStore } from "react";
import { onEvent } from "@/lib/dynamic/flow-sdk";
import { getDynamicClient } from "@/lib/dynamic/client";

function subscribe(callback: () => void): () => void {
  const unsubscribe = onEvent({ event: "initStatusChanged", listener: callback });
  return () => unsubscribe?.();
}

function getSnapshot(): boolean {
  const status = getDynamicClient()?.initStatus;
  return status === "finished" || status === "failed";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useClientInitialized(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
