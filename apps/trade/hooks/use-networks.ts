"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { onEvent } from "@/lib/dynamic";
import { getNetworksData } from "@/lib/dynamic";

/**
 * Hook to get all available networks from Dynamic dashboard config.
 * Refetches when SDK initializes or wallet connects.
 */
export function useNetworks() {
  const { data, refetch, isLoading, error } = useQuery({
    queryKey: ["networks"],
    queryFn: getNetworksData,
  });

  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const unsubs = [
      onEvent({ event: "initStatusChanged", listener: () => refetchRef.current() }),
      onEvent({ event: "walletAccountsChanged", listener: () => refetchRef.current() }),
      onEvent({ event: "walletProviderChanged", listener: () => refetchRef.current() }),
    ];
    return () => unsubs.forEach((u) => u?.());
  }, []);

  const networks = data ?? [];
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useNetworks]", {
        count: networks.length,
        networks: networks.map((n) => ({ chain: n.chain, networkId: n.networkId, displayName: n.displayName ?? (n as { name?: string }).name })),
        isLoading,
        error: error?.message,
      });
    }
  }, [data, isLoading, error]);

  return {
    networks,
    refetch,
    isLoading,
    error,
  };
}
