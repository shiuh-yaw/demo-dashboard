"use client";

/**
 * TON Transaction Handler
 *
 * Sends native TON transfers using the Dynamic SDK's `sendTon` helper.
 * The SDK handles internal message construction and broadcasting.
 *
 * Note: TON amounts use nanotons (1 TON = 10^9 nanotons).
 */

import {
  sendTon,
  type TonWalletAccount,
} from "@dynamic-labs-sdk/ton";
import { mintMfaToken, type MfaMethod } from "@/lib/dynamic";

// =============================================================================
// TYPES
// =============================================================================

interface SendTonTransactionParams {
  walletAccount: TonWalletAccount;
  /** Amount in TON (e.g., "0.5") */
  amount: string;
  /** Recipient TON address */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  stepUp?: { method: MfaMethod; code?: string };
}

// =============================================================================
// TON TRANSACTION
// =============================================================================

/** 1 TON = 10^9 nanotons */
const NANOTONS_PER_TON = 1_000_000_000;

/**
 * Send a native TON transfer
 *
 * @returns Transaction hash
 */
export async function sendTonTransaction({
  walletAccount,
  amount,
  recipient,
  stepUp,
}: SendTonTransactionParams): Promise<string> {
  if (stepUp) await mintMfaToken(stepUp);

  const amountInNanotons = BigInt(
    Math.round(parseFloat(amount) * NANOTONS_PER_TON),
  );

  const { transactionHash } = await sendTon({
    transaction: {
      recipientAddress: recipient,
      amount: amountInNanotons,
    },
    walletAccount,
  });

  return transactionHash;
}
