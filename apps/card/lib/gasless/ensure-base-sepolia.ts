import {
  getActiveNetworkId,
  switchActiveNetwork,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";

import { BASE_SEPOLIA_ID } from "@/lib/constants";

const BASE_SEPOLIA = String(BASE_SEPOLIA_ID); // "84532"

/**
 * Pin the embedded wallet to Base Sepolia before a sponsored transaction.
 *
 * `sendSponsoredTransaction` takes no chainId - it resolves the target chain
 * from the wallet's ACTIVE network (`resolveChainId` -> `getActiveNetworkData`).
 * The card is Base-Sepolia-only, so without this the mint/fund lands on the
 * Dynamic environment's default EVM network (Ethereum Sepolia) and never
 * touches the card's RUSDC balance. Switching is a no-op when already there.
 */
export async function ensureBaseSepolia(
  walletAccount: WalletAccount,
): Promise<void> {
  const { networkId } = await getActiveNetworkId({ walletAccount });
  if (networkId === BASE_SEPOLIA) return;
  await switchActiveNetwork({ networkId: BASE_SEPOLIA, walletAccount });
}
