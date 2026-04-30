"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  getEvmWalletAccount,
  getSmartWalletAccount,
  onEvent,
  offEvent,
} from "@/lib/dynamic";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { ActiveNetworkProvider } from "@/hooks/use-active-network";

/**
 * Resolves the active wallet address from the Dynamic SDK and feeds it
 * into `ActiveNetworkProvider`. Co-located here (rather than inline in
 * `providers.tsx`) so the Dynamic SDK's `"use client"` boundary stays
 * self-contained.
 *
 * Mirrors the wallet-address resolution used in `stablecoin-wallet-card`
 * and `dashboard-header`: prefer the smart wallet (kernel) account once
 * ZeroDev is loaded, falling back to the EOA signer.
 */
export function ActiveNetworkProviderHost({ children }: { children: ReactNode }) {
  const clientReady = useClientInitialized();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const smart = getSmartWalletAccount();
    const eoa = getEvmWalletAccount();
    setWalletAddress(smart?.address ?? eoa?.address ?? null);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    refresh();
    onEvent({ event: "walletAccountsChanged", listener: refresh });
    return () => {
      offEvent({ event: "walletAccountsChanged", listener: refresh });
    };
  }, [clientReady, refresh]);

  return (
    <ActiveNetworkProvider walletAddress={walletAddress}>
      {children}
    </ActiveNetworkProvider>
  );
}
