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

export async function signMessage(params: {
  walletAccount: WalletAccount;
  message: string;
}): Promise<{ signature: string }> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkSignMessage(params, client);
}
