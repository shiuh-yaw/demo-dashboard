"use client";

/**
 * Gas Sponsorship Hook
 *
 * Determines if gas sponsorship is available on the current network,
 * and returns the appropriate wallet to use for transactions.
 * Matches wallet app approach.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/can-sponsor-transaction
 */

import {
  isEvmWalletAccount,
  isNetworkSponsored,
  type WalletAccount,
  type NetworkData,
  type EvmWalletAccount,
} from "@/lib/dynamic";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";

export interface UseGasSponsorshipResult {
  isSponsored: boolean;
  isLoading: boolean;
  walletToUse: EvmWalletAccount | undefined;
  zerodevWallet: EvmWalletAccount | undefined;
  baseWallet: EvmWalletAccount | undefined;
}

export function useGasSponsorship(
  walletAddress: string | undefined,
  allWalletAccounts: WalletAccount[],
  networkData: NetworkData | undefined,
): UseGasSponsorshipResult {
  const zerodevWallet = walletAddress
    ? allWalletAccounts.find(
        (w) =>
          w.address.toLowerCase() === walletAddress.toLowerCase() &&
          w.walletProviderKey.includes("zerodev") &&
          isEvmWalletAccount(w),
      )
    : undefined;

  const baseWallet = walletAddress
    ? (getBaseWalletForAddress(
        walletAddress,
        allWalletAccounts.filter(isEvmWalletAccount),
      ) as EvmWalletAccount | undefined)
    : undefined;

  const isSponsored = networkData?.networkId
    ? isNetworkSponsored(networkData.networkId)
    : false;

  const walletToUse = isSponsored
    ? (zerodevWallet as EvmWalletAccount)
    : baseWallet;

  return {
    isSponsored,
    isLoading: false,
    walletToUse,
    zerodevWallet: zerodevWallet as EvmWalletAccount | undefined,
    baseWallet,
  };
}
