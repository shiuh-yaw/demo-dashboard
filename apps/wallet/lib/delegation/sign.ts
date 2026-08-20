/**
 * Delegated signing. Runs the two-party MPC ceremony between our stored share
 * and Dynamic's, so a stolen copy of the store cannot sign on its own.
 *
 * Three distinct secrets meet here and are easy to confuse:
 *   apiKey       - environment-wide Dynamic token (env)
 *   walletApiKey - per-wallet, from the delegation webhook
 *   keyShare     - our MPC share for that wallet, from the same webhook
 */

import type { ServerKeyShare } from "@dynamic-labs-wallet/node";
// Static imports: the native addon is declared in next.config's
// serverExternalPackages, so it stays a runtime require and is never bundled.
import {
  createDelegatedEvmWalletClient,
  delegatedSignMessage as evmDelegatedSignMessage,
} from "@dynamic-labs-wallet/node-evm";
import {
  createDelegatedSvmWalletClient,
  delegatedSignMessage as svmDelegatedSignMessage,
} from "@dynamic-labs-wallet/node-svm";

import { delegatedChainFamily } from "@/lib/delegation-chains";
import { openMaterial } from "./crypto";
import type { StoredDelegation } from "./store";

export interface DelegatedSignInput {
  delegation: StoredDelegation;
  message: string;
  environmentId: string;
  apiKey: string;
  encryptionKey: string;
}

export interface DelegatedSignResult {
  signature: string;
  signer: string;
  signedAt: string;
}

export async function signAsDelegate({
  delegation,
  message,
  environmentId,
  apiKey,
  encryptionKey,
}: DelegatedSignInput): Promise<DelegatedSignResult> {
  const keyShare = JSON.parse(
    openMaterial(delegation.encShare, encryptionKey),
  ) as ServerKeyShare;
  const walletApiKey = openMaterial(delegation.encApiKey, encryptionKey);

  const family = delegatedChainFamily(delegation.chain);
  if (!family) {
    throw new Error(`No delegated signer for chain ${delegation.chain}`);
  }

  // `shareSetId` deliberately omitted on both - the server resolves the right
  // share set from walletId. Passing WalletKeyShares.id where WaasWallets.id is
  // expected is a documented footgun.
  const request = {
    walletId: delegation.walletId,
    walletApiKey,
    keyShare,
    message,
  };

  const signature =
    family === "SVM"
      ? await svmDelegatedSignMessage(
          createDelegatedSvmWalletClient({ environmentId, apiKey }),
          request,
        )
      : await evmDelegatedSignMessage(
          createDelegatedEvmWalletClient({ environmentId, apiKey }),
          request,
        );

  return {
    signature,
    signer: delegation.walletAddress,
    signedAt: new Date().toISOString(),
  };
}
