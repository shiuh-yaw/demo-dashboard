"use client";

/**
 * Sending from a business-account wallet.
 *
 * One call for every chain. `transferAmount` dispatches to whichever chain
 * extension is registered for the wallet's chain, so EVM, Solana, Bitcoin, Sui
 * and TON all go through this - no per-chain transaction builders, and no
 * viem / web3.js / sui client in this app's dependency tree.
 *
 * Nothing here is business-account-specific, and that IS the interesting part:
 * a wallet the account owns and the user holds a share for is just a
 * `WalletAccount`. The co-signing arrangement lives in how the key was shared,
 * not in how a transfer is submitted, so any code that can send from a
 * personal embedded wallet already sends from a business one.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/transfer-amount
 */

import {
  transferAmount as sdkTransferAmount,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

export interface TransferParams {
  walletAccount: WalletAccount;
  /** Decimal string in the asset's own units, e.g. `"1.5"`. */
  amount: string;
  recipient: string;
  /** Omit for the chain's native currency. */
  token?: { address: string; decimals: number };
}

/**
 * Submit a transfer and return its hash.
 *
 * Deliberately not swallowing failures the way the read paths do: a send that
 * quietly returns nothing is indistinguishable from one that worked, and the
 * caller needs the error to tell the user their money did not move.
 */
export async function transferAmount(
  params: TransferParams,
): Promise<{ transactionHash: string }> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkTransferAmount(params, client);
}
