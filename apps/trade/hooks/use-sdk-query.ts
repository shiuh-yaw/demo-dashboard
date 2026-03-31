"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { onEvent } from "@/lib/dynamic";

type DynamicEvent =
  | "userChanged"
  | "walletAccountsChanged"
  | "logout"
  | "initStatusChanged"
  | "walletProviderChanged"
  | "tokenChanged";

interface UseSdkQueryOptions<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T> | T;
  refetchEvent?: DynamicEvent;
  refetchEvents?: DynamicEvent[];
  eventFilter?: (payload: unknown) => boolean;
  enabled?: boolean;
}

export function useSdkQuery<T>({
  queryKey,
  queryFn,
  refetchEvent,
  refetchEvents,
  eventFilter,
  enabled = true,
}: UseSdkQueryOptions<T>) {
  const { data, refetch, isLoading, error } = useQuery({
    queryKey,
    queryFn,
    enabled,
  });

  const eventFilterRef = useRef(eventFilter);
  eventFilterRef.current = eventFilter;

  const events = refetchEvents ?? (refetchEvent ? [refetchEvent] : []);

  useEffect(() => {
    if (events.length === 0) return;

    const unsubscribes = events.map((ev) =>
      onEvent({
        event: ev,
        listener: (payload: unknown) => {
          if (!eventFilterRef.current || eventFilterRef.current(payload)) {
            void refetch();
          }
        },
      }),
    );

    return () => unsubscribes.forEach((unsub) => unsub?.());
  }, [events.join(","), refetch]);

  return { data, refetch, isLoading, error };
}
