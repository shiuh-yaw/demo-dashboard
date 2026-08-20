"use client";

import { useEffect } from "react";
import { useGetWalletAccounts, useUser } from "@dynamic-labs-sdk/react-hooks";
import type { WalletAccount } from "@/lib/dynamic";

/**
 * Wallet accounts with reactive updates - thin adapter over the official
 * react-hooks binding (which subscribes to client state itself), keeping the
 * return shape existing consumers expect.
 *
 * Two guards, both against the same failure: showing "No wallets yet" to
 * someone who has wallets.
 *
 * `useGetWalletAccounts` is a `useQuery` seeded with `placeholderData: []`
 * while its queryFn awaits `waitForClientInitialized`. Placeholder data counts
 * as success, so `isLoading` is already false while the list is still a
 * stand-in - callers that gate only on `isLoading` render the empty state over
 * a signed-in user's wallets. `isPlaceholderData` is the honest signal.
 *
 * The list can also empty after the fact. Wallet accounts are derived from
 * `user.verifiedCredentials`, and any credential the SDK cannot map to a
 * wallet provider is skipped with nothing but a `debug` log ("Skipping
 * verified credential <id>"), so a thin user payload silently yields zero
 * wallets rather than an error.
 */

/**
 * Module scope on purpose: as component state this guard does nothing across a
 * screen change, and the reported case is exactly that - delegate, go back,
 * no wallets. The screen holding the ref had unmounted. Keyed by user so it
 * cannot survive into another session.
 */
let lastNonEmpty: WalletAccount[] = [];
let lastNonEmptyUserId: string | null = null;

export function useWalletAccounts() {
  const { data, refetch, isLoading, isPlaceholderData, error } =
    useGetWalletAccounts();
  const { data: user } = useUser();

  const accounts = (data ?? []) as WalletAccount[];
  const userId = user?.id ?? null;

  // Only a DIFFERENT signed-in user invalidates the cache. Clearing on a null
  // userId as well looks safer but is not: the user query reads null on any
  // render before it resolves, which wipes the cache at exactly the moment the
  // wallet list is also empty and the guard is the only thing holding it. A
  // logged-out session renders the auth screen, not a wallet list, so stale
  // entries are never shown; the next signed-in render clears them anyway.
  if (userId && userId !== lastNonEmptyUserId) {
    lastNonEmpty = [];
    lastNonEmptyUserId = userId;
  }
  if (userId && accounts.length > 0) lastNonEmpty = accounts;

  // Self-heal the hydration race this hook was written for: the query can
  // settle empty before the session restores, and the `userChanged` that would
  // invalidate it fires before `useBaseState`'s effect subscribes, so nothing
  // ever refetches. Re-ask once the user id lands - otherwise the list stays
  // empty until some unrelated mutation happens to invalidate it.
  useEffect(() => {
    if (userId && accounts.length === 0) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per user, not per list change
  }, [userId]);

  return {
    // Nothing in this app removes a wallet, so an empty list under a signed-in
    // user is the SDK losing them, never the user having none.
    walletAccounts: accounts.length > 0 ? accounts : lastNonEmpty,
    refetch,
    isLoading: isLoading || isPlaceholderData,
    error,
  };
}
