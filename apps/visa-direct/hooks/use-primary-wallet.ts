"use client";

import { useMemo } from "react";
import { useWalletAccounts } from "./use-wallet-accounts";
import { type WalletAccount } from "@/lib/dynamic";

function getPrimaryAddress(walletAccounts: WalletAccount[]): string {
  return walletAccounts[0]?.address ?? "";
}

export function usePrimaryWallet() {
  const { walletAccounts, isLoading } = useWalletAccounts();

  const walletAddress = useMemo(
    () => getPrimaryAddress(walletAccounts),
    [walletAccounts],
  );

  return {
    walletAddress,
    walletAccounts,
    isLoading,
  };
}
