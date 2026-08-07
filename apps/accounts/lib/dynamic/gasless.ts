"use client";

/**
 * Gas-sponsored EVM sends, via Dynamic's native sponsorship.
 *
 * This is EIP-7702: the wallet stays an EOA and delegates execution for the
 * call, rather than being replaced by a smart-account contract. Dynamic's own
 * relayer pays, so the wallet needs no native balance at all - which is the
 * whole point for a business account whose treasury holds USDC and no ETH.
 *
 * Deliberately NOT ZeroDev: `@dynamic-labs-sdk/evm` ships this natively at the
 * pinned version, so there is no second SDK and no kernel client to keep in
 * step.
 *
 * EVM only. Sponsorship on other chains works differently (Solana replaces the
 * fee payer server-side), and nothing here pretends otherwise - the caller
 * checks `canSponsor` first and falls back to an ordinary transfer.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/evm/send-sponsored-transaction
 */

import {
  isEvmGasSponsorshipEnabled,
  relaySponsoredTransaction,
  signSponsoredTransaction,
  waitForSponsoredTransaction,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import { encodeFunctionData, erc20Abi, parseUnits, type Hex } from "viem";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

/**
 * The steps a send actually passes through, in order.
 *
 * Only reported where the SDK exposes them as separate calls (the sponsored
 * EVM path). Everywhere else a send is one opaque call, and the UI says so
 * rather than inventing stages it cannot observe.
 */
export type SendStage = "signing" | "relaying" | "confirming";

/**
 * Can this wallet's next send be sponsored?
 *
 * Two conditions, both cheap: the project has EVM sponsorship switched on, and
 * this is an EVM wallet. Network-level support is the relayer's business - it
 * returns a terminal failure if the chain is not covered, which the caller
 * surfaces rather than guessing at here.
 */
export function canSponsorTransfer(
  walletAccount: WalletAccount | null,
): walletAccount is EvmWalletAccount {
  if (!walletAccount || walletAccount.chain !== "EVM") return false;
  const client = getClient();
  if (!client) return false;
  try {
    return isEvmGasSponsorshipEnabled(client);
  } catch {
    // `isEvmGasSponsorshipEnabled` asserts on `projectSettings` and THROWS
    // when they have not loaded yet. This runs during render, so an unguarded
    // call takes the send screen down on any first paint that beats settings
    // hydration. Unknown means unsponsored: the worst case is the user pays
    // their own gas, rather than seeing a crash.
    return false;
  }
}

/**
 * Send a transfer with gas sponsored.
 *
 * A native send is one call with a value and empty calldata; a token send is
 * one call to the contract with `transfer` encoded and zero value. That is the
 * entire difference, and it is why this takes the same arguments as the
 * unsponsored path.
 *
 * `parseUnits` rather than `parseEther` even for the native asset: the decimals
 * are passed in, and assuming 18 would be wrong on any EVM chain whose native
 * currency is not ether-like.
 */
export async function sendSponsoredTransfer(params: {
  walletAccount: EvmWalletAccount;
  /** Decimal string in the asset's own units. */
  amount: string;
  recipient: string;
  /** Omit for the chain's native currency. */
  token?: { address: string; decimals: number };
  /** Decimals of the native currency, used when `token` is omitted. */
  nativeDecimals?: number;
  /** Called as each real step completes. */
  onStage?: (stage: SendStage) => void;
}): Promise<{ transactionHash: string }> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  const {
    walletAccount,
    amount,
    recipient,
    token,
    nativeDecimals = 18,
    onStage,
  } = params;
  const recipientHex = recipient as Hex;

  const call = token
    ? {
        target: token.address as Hex,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientHex, parseUnits(amount, token.decimals)],
        }),
        value: 0n,
      }
    : {
        target: recipientHex,
        data: "0x" as Hex,
        value: parseUnits(amount, nativeDecimals),
      };

  // Composed from the three underlying calls rather than the one-shot
  // `sendSponsoredTransaction`, purely so the UI can say which step it is on.
  // Each label is reported only once the step it names has actually finished,
  // so the progress is the real thing rather than a timer pretending.
  onStage?.("signing");
  const signedTransaction = await signSponsoredTransaction(
    { walletAccount, calls: [call] },
    client,
  );

  onStage?.("relaying");
  const { requestId } = await relaySponsoredTransaction(
    { signedTransaction },
    client,
  );

  onStage?.("confirming");
  const { transactionHash } = await waitForSponsoredTransaction(
    { requestId },
    client,
  );

  return { transactionHash };
}
