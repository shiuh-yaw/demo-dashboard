"use client";

// Bridges provider-level EIP-1193-style events back into Dynamic's
// walletAccounts model. Dynamic's client-level `walletAccountsChanged` only
// fires when its internal accounts state mutates, which does NOT happen when
// an injected provider (e.g. MetaMask) switches its active address between
// already-connected accounts. Without this hook, our UI stays pinned to the
// original address.
//
// For each unique walletProviderKey in the current accounts list, we subscribe
// to `accountsChanged`. When it fires with a new address:
//   - If Dynamic already knows about it (user previously authorized)
//     → select by id, no SDK call.
//   - Otherwise → call connectWithWalletProvider, which registers the address
//     as an unverified walletAccount and emits walletAccountsChanged;
//     then select the newly-returned account id.
//
// `disconnected` is NOT handled here — Dynamic's own teardown eventually
// emits walletAccountsChanged, which cascades through useSelectedAccount's
// fallback logic.
import {
  connectWithWalletProvider,
  getConnectedAddresses,
  getDefaultClient,
  getWalletAccounts,
  offWalletProviderEvent,
  onWalletProviderEvent,
} from "@dynamic-labs-sdk/client";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { useEffect, useMemo } from "react";

export type FindExistingAccount = (args: {
  walletProviderKey: string;
  address: string;
}) => WalletAccount | null;

// Pure helper: among `accounts`, find one that matches the provider + address.
// Exposed for unit testing.
export function findExistingAccount(
  accounts: WalletAccount[],
  walletProviderKey: string,
  address: string,
): WalletAccount | null {
  const target = address.toLowerCase();
  return (
    accounts.find(
      (a) =>
        a.walletProviderKey === walletProviderKey &&
        a.address.toLowerCase() === target,
    ) ?? null
  );
}

export function useWalletProviderSync(
  accounts: WalletAccount[],
  selectAccountId: (id: string | null) => void,
): void {
  // Sorted, deduped provider keys — stable deps key for the effect.
  const providerKeysCsv = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.walletProviderKey)))
      .sort()
      .join(",");
  }, [accounts]);

  useEffect(() => {
    if (!providerKeysCsv) return;
    const providerKeys = providerKeysCsv.split(",");
    const unsubscribers: Array<() => void> = [];

    // Shared flag across the on-mount reconcile and the event listeners:
    // flipped when the effect tears down so any in-flight async work (a
    // `getConnectedAddresses` promise, or a `connectWithWalletProvider`
    // started from `reconcile`) bails out before calling `selectAccountId`
    // on an unmounted parent.
    let cancelled = false;

    // Shared reconcile step: given a live-active address for a provider,
    // pick the matching Dynamic walletAccount or register it as a new one.
    const reconcile = async (
      walletProviderKey: string,
      newAddress: string,
    ) => {
      if (cancelled) return;
      const live = getWalletAccounts(getDefaultClient());
      const existing = findExistingAccount(
        live,
        walletProviderKey,
        newAddress,
      );
      if (existing) {
        if (cancelled) return;
        selectAccountId(existing.id);
        return;
      }
      try {
        const added = await connectWithWalletProvider({ walletProviderKey });
        if (cancelled) return;
        selectAccountId(added.id);
      } catch (err) {
        console.warn(
          `[spark26] failed to register new account for ${walletProviderKey}`,
          err,
        );
      }
    };

    for (const walletProviderKey of providerKeys) {
      const listener = async ({ addresses }: { addresses: string[] }) => {
        const [newAddress] = addresses;
        if (!newAddress) {
          // Empty array = dapp disconnected from this provider. Dynamic's
          // own teardown will emit walletAccountsChanged shortly; let
          // useSelectedAccount's fallback handle the UI.
          return;
        }
        await reconcile(walletProviderKey, newAddress);
      };

      try {
        onWalletProviderEvent({
          callback: listener,
          event: "accountsChanged",
          walletProviderKey,
        });
        unsubscribers.push(() => {
          try {
            offWalletProviderEvent({
              callback: listener,
              event: "accountsChanged",
              walletProviderKey,
            });
          } catch {
            // Provider may have already been torn down.
          }
        });
      } catch (err) {
        // Provider key may not have a registered provider yet (race) — skip.
        console.warn(
          `[spark26] could not subscribe to ${walletProviderKey} accountsChanged`,
          err,
        );
      }

      // One-shot reconcile pass on mount. `walletAccountsChanged` only
      // fires for Dynamic-side state changes, and Dynamic's persisted state
      // can be stale across page refreshes if the user changed MetaMask's
      // active account between sessions. `getConnectedAddresses` does a
      // silent `eth_accounts` query so we pick up the current truth and
      // align our selection without waiting for a user-driven switch.
      void (async () => {
        try {
          const { addresses } = await getConnectedAddresses({
            walletProviderKey,
          });
          if (cancelled) return;
          const [liveAddress] = addresses;
          if (liveAddress) {
            await reconcile(walletProviderKey, liveAddress);
          }
        } catch (err) {
          console.warn(
            `[spark26] initial reconcile for ${walletProviderKey} failed`,
            err,
          );
        }
      })();
    }

    return () => {
      cancelled = true;
      for (const un of unsubscribers) un();
    };
  }, [providerKeysCsv, selectAccountId]);
}
