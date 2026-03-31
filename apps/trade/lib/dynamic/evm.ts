"use client";

/**
 * EVM Transactions (via viem)
 *
 * Create viem WalletClient instances for sending transactions on EVM chains.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/evm/getting-viem-wallet-client
 */

import { createWalletClientForWalletAccount as sdkCreateWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";

export const createWalletClientForWalletAccount =
  sdkCreateWalletClientForWalletAccount;
