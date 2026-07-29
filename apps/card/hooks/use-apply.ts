"use client";

/**
 * Submits the KYC application to the app's own `/api/card/apply` route
 * (same-origin, so no dashboard base URL / envelope-unwrapping needed - see
 * `lib/dashboard-api.ts` for the browser->dashboard client that IS used for
 * reads). On success, persists the returned card client-side via
 * `useRainCardStore().save` (Dynamic metadata), then routes to `/card`.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDynamicClient } from "@dynamic-labs-sdk/react-hooks";

import { useTrack } from "@dynamic-demos/analytics";
import type { ApplicationInput } from "@/components/application/schema";
import { useRainCardStore } from "@dynamic-demos/rain/client";
import type { RainCard } from "@/lib/rain-card";

interface UseApplyResult {
  submit: (input: ApplicationInput) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function useApply(): UseApplyResult {
  const router = useRouter();
  const client = useDynamicClient();
  const { save } = useRainCardStore();
  const { milestone } = useTrack();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: ApplicationInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const envId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
        if (envId) headers["x-dynamic-environment-id"] = envId;
        const token = client?.token;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/card/apply", {
          method: "POST",
          headers,
          body: JSON.stringify(input),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error: unknown }).error)
              : "Application failed";
          throw new Error(message);
        }

        // Persist the new card client-side (Dynamic metadata) before routing,
        // so /card resolves it from the store on arrival.
        const card = (payload as { card?: RainCard }).card;
        if (card) {
          await save(card);
          milestone("card_created");
        }
        router.push("/card");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Application failed");
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, client, save, milestone],
  );

  return { submit, isSubmitting, error };
}
