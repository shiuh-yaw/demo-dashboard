"use client";

/**
 * Signing an arbitrary message with a business-account wallet.
 *
 * The cheapest possible proof that a co-signed wallet really can sign: no
 * network, no gas, no recipient - just the key material doing its job. Worth
 * having beside Send for exactly that reason, since a failed transfer can be
 * a funding problem while a failed signature cannot.
 *
 * Like `transferAmount`, this is not a business-account call. The share the
 * user holds is what authorizes it.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/wallets/sign-message
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
