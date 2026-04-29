"use client";

// Adapted from dynamic-sdk/apps/checkout-demo/src/app/hooks/useClientState/useClientState.ts
// Subscribes to Dynamic client events and re-renders when the snapshot changes.
import type { DynamicClient, DynamicEvents } from "@dynamic-labs-sdk/client";
import { getDefaultClient, onEvent } from "@dynamic-labs-sdk/client";
import { useRef, useSyncExternalStore } from "react";

export function useClientState<T>(
  eventName: keyof DynamicEvents,
  getSnapshot: (client: DynamicClient) => T
): T {
  const client = getDefaultClient();
  const valueRef = useRef(getSnapshot(client));

  return useSyncExternalStore(
    (onStoreChange: VoidFunction) =>
      onEvent({
        event: eventName,
        listener: () => {
          valueRef.current = getSnapshot(client);
          onStoreChange();
        },
      }),
    () => valueRef.current,
    () => valueRef.current
  );
}
