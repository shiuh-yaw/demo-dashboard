"use client";

/**
 * Tracks Dynamic SDK initialization via module-level state.
 *
 * Module scope is required: the SDK starts initializing on import, so
 * `initStatusChanged` can fire before any component mounts. The promise
 * fallback covers the case where initialization finished before the
 * subscription was set up.
 */

import { useSyncExternalStore } from "react";
import {
  getInitStatus,
  onEvent,
  waitForClientInitialized,
  type InitStatus,
} from "@/lib/dynamic";

let cachedStatus: InitStatus = "uninitialized";
const listeners = new Set<() => void>();

function updateStatus(newStatus: InitStatus) {
  if (cachedStatus === newStatus) return;
  cachedStatus = newStatus;
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  try {
    cachedStatus = getInitStatus();
  } catch {
    cachedStatus = "uninitialized";
  }

  try {
    onEvent({
      event: "initStatusChanged",
      listener: () => updateStatus(getInitStatus()),
    });
  } catch {
    // Subscription failed - the promise below still resolves the status.
  }

  waitForClientInitialized()
    .then(() => updateStatus(getInitStatus()))
    .catch(() => updateStatus("failed"));
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** True once the client is ready (finished or failed). */
export function useClientInitialized(): boolean {
  const status = useSyncExternalStore(
    subscribe,
    () => cachedStatus,
    () => "uninitialized" as InitStatus,
  );
  return status === "finished" || status === "failed";
}
