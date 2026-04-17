"use client";

/**
 * Resolve a friendly display name ("MetaMask", "Coinbase Wallet", …)
 * for a persisted external-wallet provider key of the shape
 * `external:{walletProviderKey}`.
 *
 * PayoutContext stores the raw provider key so the source of truth is
 * the Dynamic SDK; this hook looks the brand name up at render time
 * so the connected-wallet card can read "via MetaMask" without us
 * having to hardcode an icon/display registry per wallet — Dynamic's
 * `getAvailableWalletProvidersData()` already has this metadata.
 *
 * Returns `null` until the SDK has initialised so callers can use a
 * neutral fallback ("External wallet") during the hydration window.
 */

import { useEffect, useState } from "react";
import {
  EXTERNAL_WALLET_PROVIDER_PREFIX,
} from "@/components/screens/connect-external-wallet-modal";
import {
  getAvailableWalletProviders,
  onEvent,
  waitForClientInitialized,
} from "@/lib/dynamic";

export function useExternalWalletLabel(
  walletProvider: string | null,
): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!walletProvider?.startsWith(EXTERNAL_WALLET_PROVIDER_PREFIX)) {
      setLabel(null);
      return;
    }
    const providerKey = walletProvider.slice(
      EXTERNAL_WALLET_PROVIDER_PREFIX.length,
    );

    let cancelled = false;
    const resolve = () => {
      const match = getAvailableWalletProviders().find(
        (p) => p.key === providerKey,
      );
      if (cancelled) return;
      setLabel(match?.metadata?.displayName ?? null);
    };

    void (async () => {
      try {
        await waitForClientInitialized();
      } catch {
        // Fall through — `resolve()` handles an empty provider list.
      }
      resolve();
    })();

    // Re-resolve when wallet accounts change (e.g. extension installed
    // mid-session), since the available-providers list can grow at
    // runtime.
    const unsub = onEvent({
      event: "walletAccountsChanged",
      listener: resolve,
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [walletProvider]);

  return label;
}
