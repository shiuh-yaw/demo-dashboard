"use client";

/**
 * Silent reissue of a fresh per-user Rain card. Used when the stored
 * `rainCard` (Dynamic metadata) can't be resolved by the dashboard's current
 * `RAIN_API_KEY` - created under a different Rain env, or the sandbox card
 * was purged. Posts the same sandbox KYC template `use-apply.ts` posts on
 * a manual application, persists the returned card via
 * `useRainCardStore().save` (client-side Dynamic metadata), then invalidates
 * the balance/transactions queries so the UI picks up the new card. See
 * `components/dynamic-card/card-view.tsx` for the not-found detection +
 * once-only trigger.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDynamicClient } from "@dynamic-labs-sdk/react-hooks";
import { SANDBOX_APPLICATION } from "@/components/application/sandbox-application";
import { useRainCardStore } from "@dynamic-demos/rain/client";
import type { RainCard } from "@/lib/rain-card";

export function useReissueCard() {
  const client = useDynamicClient();
  const queryClient = useQueryClient();
  const { save } = useRainCardStore();

  return useMutation({
    mutationFn: async () => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
      if (envId) headers["x-dynamic-environment-id"] = envId;
      if (client?.token) headers["Authorization"] = `Bearer ${client.token}`;

      const res = await fetch("/api/card/apply", {
        method: "POST",
        headers,
        body: JSON.stringify(SANDBOX_APPLICATION),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Failed to create card",
        );
      }
      // Persist the freshly issued card client-side (Dynamic metadata).
      const card = (payload as { card?: RainCard }).card;
      if (card) await save(card);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rain", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["rain", "transactions"] });
    },
  });
}
