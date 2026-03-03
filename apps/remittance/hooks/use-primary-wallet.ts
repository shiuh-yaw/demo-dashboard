"use client";

import { useMemo } from "react";
import { useWalletAccounts } from "./use-wallet-accounts";
import {
  getUniqueWalletAddresses,
  type UniqueWalletInfo,
} from "@/lib/wallet-utils";

export function usePrimaryWallet() {
  const { walletAccounts, isLoading } = useWalletAccounts();

  const primaryWallet = useMemo((): UniqueWalletInfo | null => {
    const unique = getUniqueWalletAddresses(walletAccounts);
    return unique[0] ?? null;
  }, [walletAccounts]);

  return {
    primaryWallet,
    walletAddress: primaryWallet?.address ?? "",
    walletAccounts,
    isLoading,
  };
}
