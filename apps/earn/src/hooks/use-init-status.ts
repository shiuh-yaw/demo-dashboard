"use client";

/**
 * Hook to get Dynamic client initialization status.
 * Automatically updates when init status changes.
 *
 * Useful for showing loading states during client initialization.
 */

import { useClientState } from "./use-client-state";

export type InitStatus = "idle" | "initializing" | "initialized" | "failed";

export const useInitStatus = () =>
  useClientState(
    "initStatusChanged",
    (client) => client.initStatus as InitStatus,
  );
