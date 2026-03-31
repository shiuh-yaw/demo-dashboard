"use client";

import { useMemo } from "react";
import {
  getPrimaryWalletAccount,
  isWaasWalletAccount,
  type WalletAccount,
} from "@/lib/dynamic";
import { useSdkQuery } from "./use-sdk-query";
import type { WalletOption } from "@dynamic-demos/ui";

/**
 * Check if wallet is ZeroDev (smart contract wallet).
 */
function isZerodevWallet(wallet: WalletAccount): boolean {
  const providerKey =
    (wallet as { walletProviderKey?: string }).walletProviderKey ?? "";
  return providerKey.toLowerCase().includes("zerodev");
}

/**
 * Check if wallet is an external wallet per Dynamic docs.
 * External = user's own wallet (MetaMask, Coinbase Wallet, etc.), not embedded/WaaS, not ZeroDev.
 * @see https://www.dynamic.xyz/docs/react/wallets/external-wallets/external-wallets-overview
 */
function isExternalWallet(wallet: WalletAccount): boolean {
  if (isWaasWalletAccount({ walletAccount: wallet })) return false;
  if (isZerodevWallet(wallet)) return false;
  return true;
}

/**
 * Returns enabled wallet options for the selection screen.
 * Per Dynamic docs: only show "External wallet" when user is connected via an external wallet.
 * Embedded and Fireblocks are always shown.
 */
export function useEnabledWalletOptions(): WalletOption[] {
  const { data: primaryWallet } = useSdkQuery({
    queryKey: ["primary-wallet"],
    queryFn: getPrimaryWalletAccount,
    refetchEvents: ["walletAccountsChanged", "walletProviderChanged"],
  });

  return useMemo(() => {
    const base: WalletOption[] = ["embedded", "fireblocks"];
    const active = primaryWallet ?? null;

    if (active && isExternalWallet(active)) {
      return ["external", ...base];
    }
    return base;
  }, [primaryWallet]);
}
