"use client";

import { useCallback, useMemo } from "react";
import {
  type WalletAccount,
  getPrimaryWalletAccount,
} from "@dynamic-labs-sdk/client";
import { isWaasWalletAccount } from "@dynamic-labs-sdk/client/waas";
import { useWalletAccounts } from "./use-wallet-accounts";

/**
 * Check if wallet is a ZeroDev smart wallet
 */
function isZerodevWallet(wallet: WalletAccount): boolean {
  const providerKey =
    (wallet as { walletProviderKey?: string }).walletProviderKey ?? "";
  return providerKey.toLowerCase().includes("zerodev");
}

/**
 * Check if wallet is an external browser extension wallet.
 * Uses SDK's isWaasWalletAccount type guard for accurate detection.
 */
function isExternalWallet(wallet: WalletAccount): boolean {
  // Exclude embedded/WaaS wallets (uses SDK type guard)
  if (isWaasWalletAccount({ walletAccount: wallet })) return false;

  // Exclude ZeroDev smart wallets
  if (isZerodevWallet(wallet)) return false;

  return true;
}

/**
 * Custom hook for managing external wallet accounts.
 * Uses reactive useClientState pattern for automatic updates.
 * Filters to only show external wallets (MetaMask, Coinbase, etc.)
 */
export function useWallets() {
  // Use reactive wallet accounts hook
  const allWallets = useWalletAccounts();

  // Filter to external wallets only
  const wallets = useMemo(() => {
    if (!allWallets) return [];
    return allWallets.filter(isExternalWallet);
  }, [allWallets]);

  const getDefaultWallet = useCallback((): WalletAccount | null => {
    if (wallets.length === 0) return null;
    const primary = getPrimaryWalletAccount();
    const primaryExternal = wallets.find((w) => w.address === primary?.address);
    return primaryExternal || wallets[0] || null;
  }, [wallets]);

  return {
    wallets,
    isLoading: !allWallets,
    refreshWallets: () => {}, // No longer needed with reactive hook
    getDefaultWallet,
  };
}
