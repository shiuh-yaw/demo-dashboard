"use client";

/**
 * Tron Transaction Handler
 *
 * Sends TRX transfers using the Dynamic SDK's `sendTransaction`.
 * The SDK handles building, TRX→SUN conversion, and broadcasting internally.
 *
 * Note: The SDK accepts amount in TRX (not SUN) — the conversion is automatic.
 */

import {
  sendTransaction as sdkSendTransaction,
  type TronWalletAccount,
} from "@dynamic-labs-sdk/tron";
import { getMfaDevices, authenticateTotpMfaDevice } from "@/lib/dynamic";

// =============================================================================
// TYPES
// =============================================================================

interface SendTronTransactionParams {
  walletAccount: TronWalletAccount;
  /** Amount in TRX (e.g., "10") */
  amount: string;
  /** Recipient Tron address (T-address) */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  mfaCode?: string;
}

// =============================================================================
// TRON TRANSACTION
// =============================================================================

/**
 * Send a native TRX transfer
 *
 * @returns Transaction ID
 */
export async function sendTronTransaction({
  walletAccount,
  amount,
  recipient,
  mfaCode,
}: SendTronTransactionParams): Promise<string> {
  if (mfaCode) {
    const devices = await getMfaDevices();
    if (devices.length > 0) {
      await authenticateTotpMfaDevice({
        code: mfaCode,
        createMfaTokenOptions: { singleUse: true },
      });
    }
  }

  const result = await sdkSendTransaction({
    transaction: {
      amount: parseFloat(amount),
      to: recipient,
    },
    walletAccount,
  });

  return result.txid;
}
