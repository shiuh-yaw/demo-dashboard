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
  eventFilter?: (payload: unknown) => boolean;
  enabled?: boolean;
}

export function useSdkQuery<T>({
  queryKey,
  queryFn,
  refetchEvent,
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

  useEffect(() => {
    if (!refetchEvent) return;

    const unsubscribe = onEvent({
      event: refetchEvent,
      listener: (payload: unknown) => {
        if (!eventFilterRef.current || eventFilterRef.current(payload)) {
          void refetch();
        }
      },
    });

    return unsubscribe;
  }, [refetchEvent, refetch]);

  return { data, refetch, isLoading, error };
}
