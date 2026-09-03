"use client";

/**
 * Tracks Dynamic SDK initialisation with module-level state, because the SDK
 * starts initialising on import and may finish before any component mounts.
 * Live mode only - the staged backend never imports this.
 */

import { useSyncExternalStore } from "react";
import { getInitStatus, onEvent, waitForClientInitialized, type InitStatus } from "@/lib/dynamic";

let cachedStatus: InitStatus = "uninitialized";
const listeners = new Set<() => void>();
let primed = false;

function updateStatus(next: InitStatus) {
  if (cachedStatus === next) return;
  cachedStatus = next;
  listeners.forEach((l) => l());
}

function prime() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    cachedStatus = getInitStatus();
  } catch {
    cachedStatus = "uninitialized";
  }
  try {
    onEvent({ event: "initStatusChanged", listener: () => updateStatus(getInitStatus()) });
  } catch {
    /* rely on the promise below */
  }
  waitForClientInitialized()
    .then(() => updateStatus(getInitStatus()))
    .catch(() => updateStatus("failed"));
}

export function useClientInitialized(): boolean {
  prime();
  const status = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cachedStatus,
    () => "uninitialized" as InitStatus,
  );
  return status === "finished" || status === "failed";
}
