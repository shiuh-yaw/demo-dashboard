"use client";

/**
 * Rain transaction history read. Browser -> dashboard `/api/rain/transactions`
 * via `dashboardGet` (hard rule 3: the app never calls Rain directly).
 * Polls every 5s, same cadence as `useBalance`, so a fresh spend/deposit
 * shows up in history alongside the updated balance.
 */

import { useQuery } from "@tanstack/react-query";
import { useDynamicClient } from "@dynamic-labs-sdk/react-hooks";
import type { TransactionResponse } from "@dynamic-demos/rain";
import { dashboardGet } from "@/lib/dashboard-api";
import { useRainCardStore, rainCardRef } from "@dynamic-demos/rain/client";

export function useTransactions(enabled: boolean) {
  const client = useDynamicClient();
  const { card } = useRainCardStore();
  return useQuery({
    queryKey: ["rain", "transactions"],
    queryFn: () =>
      dashboardGet<TransactionResponse[]>(
        "/api/rain/transactions",
        client?.token,
        rainCardRef(card),
      ),
    enabled: enabled && !!card,
    // Poll every 5s while healthy; back off to 30s while erroring so a failing
    // endpoint isn't hammered every 5s (mirrors useBalance).
    refetchInterval: (query) => (query.state.error ? 30_000 : 5000),
    retry: false,
  });
}
