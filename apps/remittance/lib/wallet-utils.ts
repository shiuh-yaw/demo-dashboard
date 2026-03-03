/**
 * Wallet Utilities — helpers for working with Dynamic wallet accounts
 */

import type { WalletAccount } from "@dynamic-labs-sdk/client";

/**
 * Find the base (non-ZeroDev) wallet for an address
 */
export function getBaseWalletForAddress(
  address: string,
  walletAccounts: WalletAccount[],
): WalletAccount | undefined {
  const walletsForAddress = walletAccounts.filter(
    (w) => w.address.toLowerCase() === address.toLowerCase(),
  );

  const baseWallet = walletsForAddress.find(
    (w) => !w.walletProviderKey.includes("zerodev"),
  );

  return baseWallet || walletsForAddress[0];
}

export interface UniqueWalletInfo {
  address: string;
  chain: string;
  hasZeroDev: boolean;
  walletAccount: WalletAccount;
}

/**
 * Get unique wallet addresses for display (deduped by address)
 */
export function getUniqueWalletAddresses(
  walletAccounts: WalletAccount[],
): UniqueWalletInfo[] {
  const map = new Map<string, UniqueWalletInfo>();

  for (const wallet of walletAccounts) {
    const addressLower = wallet.address.toLowerCase();
    const hasZeroDev = wallet.walletProviderKey.includes("zerodev");
    const existing = map.get(addressLower);

    if (!existing) {
      map.set(addressLower, {
        address: wallet.address,
        chain: wallet.chain,
        hasZeroDev,
        walletAccount: wallet,
      });
    } else if (hasZeroDev) {
      existing.hasZeroDev = true;
    }
  }

  return Array.from(map.values());
}
