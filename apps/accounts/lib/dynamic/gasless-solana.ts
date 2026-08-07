"use client";

/**
 * Gas-sponsored Solana sends.
 *
 * Different mechanism from EVM, same purpose: Dynamic's backend replaces the
 * fee payer on a transaction the user signs, so the wallet needs no SOL. There
 * is no EIP-7702 here and nothing is delegated - the wallet signs its own
 * transfer and someone else pays to land it.
 *
 * The cost of this path is that it cannot go through `transferAmount`, which
 * takes no sponsorship flag: the transaction has to be BUILT here to be handed
 * to `signAndSendSponsoredTransaction`. That is why this app carries
 * `@solana/web3.js` and `@solana/spl-token` while the other four chains need
 * nothing.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/solana/svm-gas-sponsorship
 */

import {
  isSolanaGasSponsorshipEnabled,
  signAndSendSponsoredTransaction,
  type SolanaWalletAccount,
} from "@dynamic-labs-sdk/solana";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { getClient } from "./client";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Can this wallet's next send be sponsored?
 *
 * Guarded, because the SDK's settings accessors assert on `projectSettings`
 * and throw before those load. This runs during render, so an unguarded call
 * would take the screen down on a first paint that beats hydration. Unknown
 * means unsponsored - the user pays their own fee, which beats a crash.
 */
export function canSponsorSolanaTransfer(
  walletAccount: WalletAccount | null,
): walletAccount is SolanaWalletAccount {
  if (!walletAccount || walletAccount.chain !== "SOL") return false;
  const client = getClient();
  if (!client) return false;
  try {
    return isSolanaGasSponsorshipEnabled(client);
  } catch {
    return false;
  }
}

/** Native SOL transfer, as an unsigned versioned transaction. */
async function buildSolTransfer(params: {
  connection: Connection;
  from: PublicKey;
  to: PublicKey;
  amount: string;
}): Promise<VersionedTransaction> {
  const { connection, from, to, amount } = params;
  const { blockhash } = await connection.getLatestBlockhash("finalized");

  const message = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: Math.round(Number(amount) * LAMPORTS_PER_SOL),
      }),
    ],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}

/** SPL token transfer, creating the recipient's token account if needed. */
async function buildTokenTransfer(params: {
  connection: Connection;
  from: PublicKey;
  to: PublicKey;
  amount: string;
  mint: PublicKey;
  decimals: number;
}): Promise<VersionedTransaction> {
  const { connection, from, to, amount, mint, decimals } = params;

  const [fromToken, toToken] = await Promise.all([
    getAssociatedTokenAddress(mint, from),
    getAssociatedTokenAddress(mint, to),
  ]);

  const instructions = [];

  // A recipient who has never held this token has no account for it. Creating
  // it here is what makes a first-time transfer land instead of failing.
  const toTokenInfo = await connection.getAccountInfo(toToken);
  if (!toTokenInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(from, toToken, to, mint),
    );
  }

  instructions.push(
    createTransferCheckedInstruction(
      fromToken,
      mint,
      toToken,
      from,
      BigInt(Math.round(Number(amount) * 10 ** decimals)),
      decimals,
    ),
  );

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const message = new TransactionMessage({
    payerKey: from,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
}

/**
 * Send a Solana transfer with the fee sponsored.
 *
 * Returns the signature under the name the rest of the app uses for a
 * transaction hash, so callers do not branch on chain to read the result.
 */
export async function sendSponsoredSolanaTransfer(params: {
  walletAccount: SolanaWalletAccount;
  /** Decimal string in the asset's own units. */
  amount: string;
  recipient: string;
  /** Omit for native SOL. */
  token?: { address: string; decimals: number };
  /** RPC endpoint from the wallet's active network. */
  rpcUrl: string;
}): Promise<{ transactionHash: string }> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  const { walletAccount, amount, recipient, token, rpcUrl } = params;
  const connection = new Connection(rpcUrl, "confirmed");
  const from = new PublicKey(walletAccount.address);
  const to = new PublicKey(recipient);

  const transaction = token
    ? await buildTokenTransfer({
        connection,
        from,
        to,
        amount,
        mint: new PublicKey(token.address),
        decimals: token.decimals,
      })
    : await buildSolTransfer({ connection, from, to, amount });

  const { signature } = await signAndSendSponsoredTransaction(
    { walletAccount, transaction },
    client,
  );

  return { transactionHash: signature };
}
