"use client";

/**
 * SUI Transaction Handler
 *
 * Sends native SUI transfers using the Dynamic SDK's `signAndExecuteTransaction`.
 * Builds a `Transaction` via `@mysten/sui/transactions` (bundled with @dynamic-labs-sdk/sui).
 *
 * @see https://docs.sui.io/devnet/build/prog-trans-ts-sdk
 */

import { Transaction } from "@mysten/sui/transactions";
import {
  signAndExecuteTransaction,
  type SuiWalletAccount,
} from "@dynamic-labs-sdk/sui";
import { mintMfaToken, type MfaMethod } from "@/lib/dynamic";

// =============================================================================
// TYPES
// =============================================================================

interface SendSuiTransactionParams {
  walletAccount: SuiWalletAccount;
  /** Amount in SUI (e.g., "0.1") */
  amount: string;
  /** Recipient SUI address */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  stepUp?: { method: MfaMethod; code?: string };
}

// =============================================================================
// SUI TRANSACTION
// =============================================================================

/** 1 SUI = 10^9 MIST */
const MIST_PER_SUI = 1_000_000_000;

/**
 * Send a native SUI transfer
 *
 * @returns Digest (transaction hash) string
 */
export async function sendSuiTransaction({
  walletAccount,
  amount,
  recipient,
  stepUp,
}: SendSuiTransactionParams): Promise<string> {
  if (stepUp) await mintMfaToken(stepUp);

  const amountInMist = BigInt(
    Math.round(parseFloat(amount) * MIST_PER_SUI),
  );

  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
  tx.transferObjects([coin], recipient);

  const result = await signAndExecuteTransaction({
    transaction: tx,
    walletAccount,
  });

  return result.digest;
}
