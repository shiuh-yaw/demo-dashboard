"use client";

import { useSyncExternalStore } from "react";
import { getWalletAccounts, onEvent, type WalletAccount } from "@/lib/dynamic";

function subscribeToWalletEvents(callback: () => void): () => void {
  const unsubscribes = [
    onEvent({ event: "walletAccountsChanged", listener: callback }),
    onEvent({ event: "userChanged", listener: callback }),
  ];
  return () => unsubscribes.forEach((unsub) => unsub?.());
}

let cachedWallet: WalletAccount | null = null;
let cachedAddress: string | undefined = undefined;

function getWalletSnapshot(): WalletAccount | null {
  const accounts = getWalletAccounts();
  const wallet = accounts[0] ?? null;
  const address = wallet?.address;

  if (address === cachedAddress) {
    return cachedWallet;
  }
  cachedAddress = address;
  cachedWallet = wallet;
  return wallet;
}

function getWalletServerSnapshot(): WalletAccount | null {
  return null;
}

export function usePrimaryWallet() {
  const wallet = useSyncExternalStore(
    subscribeToWalletEvents,
    getWalletSnapshot,
    getWalletServerSnapshot,
  );

  return {
    primaryWallet: wallet,
    walletAddress: wallet?.address ?? "",
  };
}
