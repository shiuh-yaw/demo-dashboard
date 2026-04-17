"use client";

import { useSyncExternalStore } from "react";
import {
  getInitStatus,
  onEvent,
  waitForClientInitialized,
  type InitStatus,
} from "@/lib/dynamic";

let cachedStatus: InitStatus = "uninitialized";
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function updateStatus(newStatus: InitStatus) {
  if (cachedStatus !== newStatus) {
    cachedStatus = newStatus;
    notifyListeners();
  }
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
    // Subscription failed - rely on promise fallback
  }

  waitForClientInitialized()
    .then(() => updateStatus(getInitStatus()))
    .catch(() => updateStatus("failed"));
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): InitStatus {
  return cachedStatus;
}

function getServerSnapshot(): InitStatus {
  return "uninitialized";
}

export function useClientInitialized(): boolean {
  const status = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return status === "finished" || status === "failed";
}
