"use client";

/**
 * Bitcoin Transaction Handler
 *
 * Sends BTC using the Dynamic SDK's `sendBitcoin` helper.
 * The SDK handles PSBT construction and signing internally.
 *
 * Note: Bitcoin amounts use satoshis (1 BTC = 100_000_000 sats).
 */

import {
  sendBitcoin,
  type BitcoinWalletAccount,
} from "@dynamic-labs-sdk/bitcoin";
import { mintMfaToken, type MfaMethod } from "@/lib/dynamic";

// =============================================================================
// TYPES
// =============================================================================

interface SendBitcoinTransactionParams {
  walletAccount: BitcoinWalletAccount;
  /** Amount in BTC (e.g., "0.001") */
  amount: string;
  /** Recipient Bitcoin address */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  stepUp?: { method: MfaMethod; code?: string };
}

// =============================================================================
// BITCOIN TRANSACTION
// =============================================================================

/** 1 BTC = 10^8 satoshis */
const SATS_PER_BTC = 100_000_000;

/**
 * Send a Bitcoin transaction
 *
 * @returns Transaction ID
 */
export async function sendBitcoinTransaction({
  walletAccount,
  amount,
  recipient,
  stepUp,
}: SendBitcoinTransactionParams): Promise<string> {
  if (stepUp) await mintMfaToken(stepUp);

  const amountInSats = BigInt(
    Math.round(parseFloat(amount) * SATS_PER_BTC),
  );

  const { transactionId } = await sendBitcoin({
    transaction: {
      amount: amountInSats,
      recipientAddress: recipient,
    },
    walletAccount,
  });

  return transactionId;
}
