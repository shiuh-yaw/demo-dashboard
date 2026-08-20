"use client";

/**
 * Delegated access state for the settings drill-in.
 *
 * `hasDelegatedAccess()` is the only authority: Dynamic has reshared, or it
 * has not. The app's own store is deliberately not consulted - whether our
 * server has received its share yet is our problem, not a state to put in
 * front of the user, and a sign that beats the webhook answers 409.
 */

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  useDelegateWaasKeyShares,
  useDynamicClient,
  useRevokeWaasDelegation,
} from "@dynamic-labs-sdk/react-hooks";
import { hasDelegatedAccess, type WalletAccount } from "@/lib/dynamic";
import { isDelegatableChain } from "@/lib/delegation-chains";
import {
  isIntentSettled,
  resolveDelegationState,
  type DelegationIntent,
  type DelegationState,
} from "@/lib/delegation-state";
import { signAsDelegate, type DelegatedSignature } from "@/lib/delegation-api";

/**
 * Holds what the user just asked for across the window where nothing reflects
 * it yet: `mutate`'s callbacks run after the mutation has settled, while
 * the SDK's own refreshAuth is still landing. Clearing is derived - the moment Dynamic
 * agrees, the intent stops being pending - so no caller has to reset it.
 */
export function useDelegationIntent(delegatedOnDynamic: boolean) {
  const [intent, setIntent] = useState<DelegationIntent | null>(null);

  const pending =
    intent && isIntentSettled(intent, delegatedOnDynamic) ? null : intent;

  const start = useCallback((next: DelegationIntent) => setIntent(next), []);
  const abandon = useCallback(() => setIntent(null), []);

  return { pending, start, abandon };
}

/**
 * Use the SDK's own mutation hooks, not hand-rolled wrappers over the plain
 * functions: `hasDelegatedAccess` reads the delegated key share off the
 * *user's* verified credential, and only these hooks invalidate the SDK's user
 * cache. Wrapping the raw function leaves the status stuck at "off" until a
 * hard refresh, even though Dynamic already reshared.
 *
 * Do NOT add `refreshUser()` here. `delegateWaasKeyShares` and
 * `revokeWaasDelegation` both end in `refreshAuth`, a full verify call that
 * repopulates the user *with* `walletProperties.keyShares`. `refreshUser` hits
 * the authenticated-user endpoint instead, whose slimmer profile has no
 * keyShares - running it afterwards overwrites the good state with one where
 * `hasDelegatedAccess` is false forever and the wallet list is empty.
 */
export function useDelegateWallet() {
  const mutation = useDelegateWaasKeyShares();
  return {
    ...mutation,
    mutate: (
      walletAccount: WalletAccount,
      options?: { onError?: () => void },
    ) =>
      mutation.mutate(
        { walletAccount },
        { onError: () => options?.onError?.() },
      ),
  };
}

export function useRevokeDelegation() {
  const mutation = useRevokeWaasDelegation();
  return {
    ...mutation,
    mutate: (
      walletAccount: WalletAccount,
      options?: { onError?: () => void },
    ) =>
      mutation.mutate(
        { walletAccount },
        { onError: () => options?.onError?.() },
      ),
  };
}

/**
 * Signs by ADDRESS. The client has no reliable `walletId`: `walletAccount.id`
 * is the SDK's identifier and is not Dynamic's, which is what the webhook
 * stored. The address is the one key both sides agree on.
 */
export function useSignAsDelegate() {
  const client = useDynamicClient();
  return useMutation<
    DelegatedSignature,
    Error,
    { address: string; message: string }
  >({
    mutationFn: (input) => signAsDelegate(client?.token, input),
  });
}

/** Chains a delegated signer package ships for; others never appear in the UI. */
export function isDelegatableWallet(walletAccount: WalletAccount): boolean {
  return isDelegatableChain(walletAccount.chain);
}

export { hasDelegatedAccess, resolveDelegationState };
export type { DelegationState };
