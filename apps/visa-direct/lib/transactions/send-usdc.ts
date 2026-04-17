"use client";

/**
 * Send USDC from the host's embedded ZeroDev kernel wallet to an
 * external EVM address as a gas-sponsored UserOperation.
 *
 * Implementation note — we intentionally do NOT use Dynamic's
 * `sendUserOperation` wrapper. That wrapper calls
 * `kernelClient.prepareUserOperation(...)` and then passes the
 * resulting userOp (which contains the ECDSA validator's *stub*
 * signature used for gas estimation) into
 * `kernelClient.sendUserOperation(userOp)`. viem's bundler action
 * treats a pre-populated `signature` field as authoritative and
 * skips the signing step — the stub signature gets submitted as-is
 * and the bundler rejects with `AA24 signature error`.
 *
 * Instead we build the kernel client ourselves and call
 * `kernelClient.sendUserOperation({ calls })`. That path internally
 * prepares, signs via `account.signUserOperation()`, and submits —
 * which is what ERC-4337 actually requires.
 *
 * If the paymaster refuses sponsorship (no policy, over quota, …)
 * we rebuild the client without sponsorship and retry so the user's
 * wallet pays its own gas instead of the UX failing outright.
 */

import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import {
  switchActiveNetwork,
  type EvmWalletAccount,
  type NetworkData,
} from "@/lib/dynamic";
import { ensureZerodev } from "@/lib/dynamic/zerodev";
import { getUsdcAddress } from "@/lib/network-config";

export interface SendUsdcParams {
  walletAccount: EvmWalletAccount;
  networkData: NetworkData;
  amount: string;
  recipient: `0x${string}`;
}

const USDC_DECIMALS = 6;

export async function sendUsdc({
  walletAccount,
  networkData,
  amount,
  recipient,
}: SendUsdcParams): Promise<`0x${string}`> {
  const chainId = Number(networkData.networkId);
  const usdcAddress = getUsdcAddress(chainId);
  if (!usdcAddress) {
    throw new Error(
      `USDC isn't configured on ${networkData.displayName ?? `chain ${chainId}`}. Switch networks and try again.`,
    );
  }

  // Align Dynamic's active network first — the kernel client reads
  // from it when no explicit networkId override is supplied. Safe to
  // call when already active; the SDK short-circuits.
  await switchActiveNetwork({
    networkId: networkData.networkId,
    walletAccount,
  });

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, parseUnits(amount, USDC_DECIMALS)],
  });

  const calls = [{ to: usdcAddress, data, value: 0n }];

  const { createKernelClientForWalletAccount, isGasSponsorshipError } =
    await ensureZerodev();

  async function broadcast(withSponsorship: boolean): Promise<`0x${string}`> {
    const kernelClient = await createKernelClientForWalletAccount({
      smartWalletAccount: walletAccount,
      networkId: networkData.networkId,
      withSponsorship,
    });

    // sendUserOperation({ calls }) prepares + signs + submits in one
    // shot. We deliberately don't pre-call prepareUserOperation here
    // — see file-level comment for why.
    const userOpHash = await kernelClient.sendUserOperation({ calls });

    const receipt = await kernelClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    return receipt.receipt.transactionHash;
  }

  try {
    return await broadcast(true);
  } catch (err) {
    if (isGasSponsorshipError(err)) return broadcast(false);
    throw err;
  }
}
