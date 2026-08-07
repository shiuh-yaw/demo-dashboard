"use client";

/**
 * Which accounts this user hides, and how to change that.
 *
 * Backed by their Dynamic user metadata through this app's own route, so the
 * choice follows the person rather than the browser. Optimistic: hiding is a
 * list-visibility tweak, and waiting on a round trip to redraw a row the user
 * just acted on reads as lag. A failed write rolls back and surfaces.
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchHiddenAccounts,
  saveHiddenAccounts,
  withHiddenAccount,
} from "@/lib/business-accounts/hidden-accounts";
import { useAuth } from "@/hooks/use-auth";

const KEY = ["hidden-accounts"] as const;

export interface HiddenAccounts {
  hidden: readonly string[];
  /** True until the stored list has been read at least once. */
  isLoading: boolean;
  isHidden: (businessAccountId: string) => boolean;
  setHidden: (businessAccountId: string, hidden: boolean) => void;
  /** Non-null when the last write failed. */
  error: unknown;
}

export function useHiddenAccounts(): HiddenAccounts {
  const isLoggedIn = useAuth();
  const queryClient = useQueryClient();

  const { data: hidden = [], isPending } = useQuery({
    queryKey: KEY,
    queryFn: fetchHiddenAccounts,
    enabled: isLoggedIn,
    // The list is small and rarely changes; refetching it on every focus would
    // be three requests to hide one row.
    staleTime: 5 * 60 * 1000,
  });

  const save = useMutation({
    mutationFn: saveHiddenAccounts,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<string[]>(KEY);
      queryClient.setQueryData<string[]>(KEY, [...next]);
      return { previous };
    },
    onError: (_error, _next, context) => {
      // Put the row back rather than leaving the list claiming something the
      // server never accepted.
      queryClient.setQueryData<string[]>(KEY, context?.previous ?? []);
    },
    // Adopt what the server actually kept - it dedupes and caps.
    onSuccess: (stored) => queryClient.setQueryData<string[]>(KEY, stored),
  });

  const setHidden = useCallback(
    (businessAccountId: string, next: boolean) => {
      const updated = withHiddenAccount(hidden, businessAccountId, next);
      save.mutate(updated);
    },
    [hidden, save],
  );

  return {
    hidden,
    // Not yet known - a list rendered now would show every hidden account for
    // a frame before this resolves. `enabled: false` reports pending forever,
    // so a signed-out caller reads as known-empty rather than loading.
    isLoading: isLoggedIn && isPending,
    isHidden: (businessAccountId) => hidden.includes(businessAccountId),
    setHidden,
    error: save.error,
  };
}
