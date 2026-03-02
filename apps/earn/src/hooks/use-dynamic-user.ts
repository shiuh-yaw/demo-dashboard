"use client";

/**
 * Hook to get the current Dynamic user.
 * Automatically updates when user state changes.
 */

import { useClientState } from "./use-client-state";

export const useDynamicUser = () =>
  useClientState("userChanged", (client) => client.user);
