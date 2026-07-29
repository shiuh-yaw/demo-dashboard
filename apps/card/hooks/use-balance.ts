"use client";

/**
 * Rain credit balance read. Browser -> dashboard `/api/rain/balance` via
 * `dashboardGet` (hard rule 3: the app never calls Rain directly). Fetches on
 * mount, then polls only inside a post-action window (see
 * `useBalancePollInterval`) - the spending power only moves when the user
 * deposits (and Rain then credits it), so there's nothing to watch for the
 * rest of the time; manual refresh covers edge cases.
 */

import { useQuery } from "@tanstack/react-query";
import { useDynamicClient } from "@dynamic-labs-sdk/react-hooks";
import type { UserCreditBalanceResponse } from "@dynamic-demos/rain";
import { dashboardGet } from "@/lib/dashboard-api";
import { useRainCardStore, rainCardRef } from "@dynamic-demos/rain/client";
import { useBalancePollInterval } from "@/contexts/balance-watch-context";

export function useBalance(enabled: boolean) {
  const client = useDynamicClient();
  const { card } = useRainCardStore();
  const refetchInterval = useBalancePollInterval();
  return useQuery({
    queryKey: ["rain", "balance"],
    queryFn: () =>
      dashboardGet<UserCreditBalanceResponse>(
        "/api/rain/balance",
        client?.token,
        rainCardRef(card),
      ),
    enabled: enabled && !!card,
    refetchInterval,
    retry: false,
  });
}
