"use client";

/**
 * Starknet Transaction Handler
 *
 * Sends native ETH transfers on Starknet using the Dynamic SDK's
 * `getStarknetAccount` to get a starknet.js `WalletAccount`, then
 * executes a low-level ERC-20 transfer on the ETH contract.
 *
 * On Starknet, ETH is an ERC-20 token at a well-known address.
 * 1 ETH = 10^18 WEI (same as L1).
 */

import {
  getStarknetAccount,
  ETH_STARKNET_ADDRESS,
  ETH_CONTRACT_ABI,
  WEI_PER_ETH,
  type StarknetWalletAccount,
} from "@dynamic-labs-sdk/starknet";
import { getMfaDevices, authenticateTotpMfaDevice } from "@/lib/dynamic";
import { uint256 } from "starknet";

// =============================================================================
// TYPES
// =============================================================================

interface SendStarknetTransactionParams {
  walletAccount: StarknetWalletAccount;
  /** Amount in ETH (e.g., "0.001") */
  amount: string;
  /** Recipient Starknet address */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  mfaCode?: string;
}

// =============================================================================
// STARKNET TRANSACTION
// =============================================================================

/**
 * Send a native ETH transfer on Starknet
 *
 * @returns Transaction hash
 */
export async function sendStarknetTransaction({
  walletAccount,
  amount,
  recipient,
  mfaCode,
}: SendStarknetTransactionParams): Promise<string> {
  if (mfaCode) {
    const devices = await getMfaDevices();
    if (devices.length > 0) {
      await authenticateTotpMfaDevice({
        code: mfaCode,
        createMfaTokenOptions: { singleUse: true },
      });
    }
  }

  const { account } = await getStarknetAccount({ walletAccount });

  const amountInWei = BigInt(
    Math.round(parseFloat(amount) * WEI_PER_ETH),
  );
  const amountUint256 = uint256.bnToUint256(amountInWei);

  const result = await account.execute({
    contractAddress: ETH_STARKNET_ADDRESS,
    entrypoint: "transfer",
    calldata: [recipient, amountUint256.low, amountUint256.high],
  });

  return result.transaction_hash;
}
