"use client";

/**
 * Sign an arbitrary UTF-8 message with a Dynamic wallet account. No network, no
 * gas, no recipient - the cheapest proof that the embedded wallet controls its
 * key. Delegates to the SDK's `signMessage`, which routes to the right chain
 * signer for the given `walletAccount`.
 */

import {
  signMessage as sdkSignMessage,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { getClient } from "./client";
import { mintMfaToken, type MfaMethod } from "./mfa";

export async function signMessage(params: {
  walletAccount: WalletAccount;
  message: string;
  /** Factor to present when MFA gates signing (WalletWaasSign). */
  stepUp?: { method: MfaMethod; code?: string };
}): Promise<{ signature: string }> {
  const { walletAccount, message, stepUp } = params;
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  // Mint a single-use MFA token right before the signature, same step-up
  // the send flow uses.
  if (stepUp) await mintMfaToken(stepUp);

  return sdkSignMessage({ walletAccount, message }, client);
}
