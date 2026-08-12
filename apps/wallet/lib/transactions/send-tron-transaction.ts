"use client";

/**
 * Send a native TRX transfer from a Dynamic embedded wallet.
 *
 * The chain package does the work: `sendTransaction` resolves TronWeb from
 * the wallet provider and converts the amount to SUN itself, so this wrapper
 * only mints the MFA token and hands the transfer over.
 */

import { sendTransaction as sdkSendTronTransaction } from "@dynamic-labs-sdk/tron";
import {
  mintMfaToken,
  type MfaMethod,
  type TronWalletAccount,
} from "@/lib/dynamic";

export interface SendTronTransactionParams {
  walletAccount: TronWalletAccount;
  amount: string;
  recipient: string;
  stepUp?: { method: MfaMethod; code?: string };
}

export async function sendTronTransaction({
  walletAccount,
  amount,
  recipient,
  stepUp,
}: SendTronTransactionParams): Promise<string> {
  if (stepUp) await mintMfaToken(stepUp);

  const result = await sdkSendTronTransaction({
    walletAccount,
    // The SDK takes TRX as a number and converts to SUN itself.
    transaction: { amount: Number(amount), to: recipient },
  });

  // TronWeb returns the broadcast receipt, not a bare hash.
  return result.txid ?? result.transaction?.txID ?? "";
}
