/**
 * ERC-20 USDC transfer from the user's external wallet to the Fireblocks
 * vault deposit address, using the Dynamic SDK's viem wallet client.
 */

import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import {
  type EvmWalletAccount,
  type NetworkData,
  createWalletClientForWalletAccount,
  switchActiveNetwork,
} from "@/lib/dynamic";
import { DEPOSIT_ASSETS } from "@/lib/assets";
import type { DepositNetwork } from "@/lib/deposit-network";

export interface SendDepositParams {
  walletAccount: EvmWalletAccount;
  depositAddress: `0x${string}`;
  amount: string;
  network: DepositNetwork;
  networkData: NetworkData;
}

/**
 * Send USDC from the connected external wallet to the vault deposit address.
 * Switches MetaMask to the correct chain, then broadcasts an ERC-20 `transfer`.
 *
 * @returns The on-chain transaction hash.
 */
export async function sendDeposit({
  walletAccount,
  depositAddress,
  amount,
  network,
  networkData,
}: SendDepositParams): Promise<string> {
  const asset = DEPOSIT_ASSETS.USDC;

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [depositAddress, parseUnits(amount, asset.decimals)],
  });

  const tx = {
    to: asset.contract[network],
    data,
    value: BigInt(0),
  };

  await switchActiveNetwork({
    networkId: networkData.networkId,
    walletAccount,
  });

  const walletClient = await createWalletClientForWalletAccount({
    walletAccount,
  });

  return await walletClient.sendTransaction(tx);
}
