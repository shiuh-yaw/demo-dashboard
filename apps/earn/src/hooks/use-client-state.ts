"use client";

/**
 * Hook for syncing Dynamic client state to React state.
 *
 * Simplified version that uses useState + useEffect instead of useSyncExternalStore
 * to avoid SSR/hydration complexity in Next.js.
 *
 * NOTE: For server-side auth, use cookies + getCurrentUser() from session.ts.
 * This hook is for client-side reactive state only.
 */

import { useEffect, useState, useRef } from "react";
import { onEvent, type DynamicClient } from "@dynamic-labs-sdk/client";
import { getDynamicClient, offEvent } from "@/lib/dynamic";

type DynamicEventName =
  | "userChanged"
  | "tokenChanged"
  | "walletAccountsChanged"
  | "initStatusChanged"
  | "projectSettingsChanged"
  | "walletProviderChanged"
  | "logout";

/**
 * Hook that syncs Dynamic client state to React state.
 *
 * @param eventName - Dynamic event to listen for
 * @param getSnapshot - Function to extract state from the Dynamic client
 */
export function useClientState<T>(
  eventName: DynamicEventName,
  getSnapshot: (client: DynamicClient) => T,
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  // Use ref to store getSnapshot to avoid dependency issues
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;

  useEffect(() => {
    // Helper to get current value
    const getValue = (): T | undefined => {
      if (typeof window === "undefined") return undefined;
      try {
        return getSnapshotRef.current(getDynamicClient());
      } catch {
        return undefined;
      }
    };

    // Get initial value
    setValue(getValue());

    // Subscribe to event
    const listener = () => {
      setValue(getValue());
    };

    onEvent({ event: eventName as any, listener });

    // Cleanup
    return () => {
      offEvent({ event: eventName as any, listener });
    };
  }, [eventName]); // Only depend on eventName, not getSnapshot

  return value;
}
