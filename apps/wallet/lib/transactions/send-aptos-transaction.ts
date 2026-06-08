"use client";

/**
 * Aptos Transaction Handler
 *
 * Sends native APT transfers using the Dynamic SDK's `signAndSubmitTransaction`.
 * The SDK builds, signs, and submits the transaction via the Aptos provider.
 *
 * Note: Aptos amounts use Octas (1 APT = 10^8 Octas).
 */

import {
  signAndSubmitTransaction,
  type AptosWalletAccount,
} from "@dynamic-labs-sdk/aptos";
import { getMfaDevices, authenticateTotpMfaDevice } from "@/lib/dynamic";

// =============================================================================
// TYPES
// =============================================================================

interface SendAptosTransactionParams {
  walletAccount: AptosWalletAccount;
  /** Amount in APT (e.g., "0.1") */
  amount: string;
  /** Recipient Aptos address */
  recipient: string;
  /** TOTP code for MFA-protected transactions */
  mfaCode?: string;
}

// =============================================================================
// APTOS TRANSACTION
// =============================================================================

/** 1 APT = 10^8 Octas */
const OCTAS_PER_APT = 100_000_000;

/**
 * Send a native APT transfer
 *
 * @returns Transaction hash
 */
export async function sendAptosTransaction({
  walletAccount,
  amount,
  recipient,
  mfaCode,
}: SendAptosTransactionParams): Promise<string> {
  if (mfaCode) {
    const devices = await getMfaDevices();
    if (devices.length > 0) {
      await authenticateTotpMfaDevice({
        code: mfaCode,
        createMfaTokenOptions: { singleUse: true },
      });
    }
  }

  const amountInOctas = Math.round(parseFloat(amount) * OCTAS_PER_APT);

  const { hash } = await signAndSubmitTransaction({
    transaction: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [recipient, amountInOctas],
    },
    walletAccount,
  });

  return hash;
}
