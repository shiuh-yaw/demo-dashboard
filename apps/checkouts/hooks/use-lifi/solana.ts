/**
 * Solana-specific LI.FI integration functions
 *
 * Handles Solana wallet adapter creation, provider configuration,
 * and direct token transfers for LI.FI swaps.
 */

import {
  getSolanaWalletAccount,
  getSolanaConnection,
  getWalletAccounts,
  isSolanaWallet,
  type SolanaWallet,
} from "@/lib/dynamicClient";
import {
  signAndSendTransaction,
  signTransaction as dynamicSignTransaction,
  signAllTransactions as dynamicSignAllTransactions,
} from "@dynamic-labs-sdk/solana";
import { isUserRejection } from "@/lib/format";
import { LIFI_SOLANA_CHAIN_ID } from "@/lib/widget-config";
import { Solana } from "@lifi/sdk";
import type { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import type { ExecuteSwapOptions } from "./index";

/**
 * Creates a SignerWalletAdapter wrapper for Dynamic's Solana wallet.
 * Bridges Dynamic SDK to LI.FI SDK's expected wallet interface.
 *
 * @param wallet - Dynamic Solana wallet account
 * @returns SignerWalletAdapter compatible with LI.FI SDK
 */
export function createSolanaAdapter(wallet: SolanaWallet): SignerWalletAdapter {
  const publicKey = new PublicKey(wallet.address);

  return {
    publicKey,
    connected: true,
    connecting: false,

    /**
     * Sign a single transaction using Dynamic SDK
     * @see https://www.dynamic.xyz/docs/javascript-sdk/solana/signing-and-sending-transactions
     */
    async signTransaction<T extends Transaction | VersionedTransaction>(
      transaction: T
    ): Promise<T> {
      const { signedTransaction } = await dynamicSignTransaction({
        walletAccount: wallet,
        transaction: transaction as any, // Version mismatch workaround
      });
      return signedTransaction as unknown as T;
    },

    /**
     * Sign multiple transactions using Dynamic SDK
     * @see https://www.dynamic.xyz/docs/javascript-sdk/solana/signing-and-sending-transactions
     */
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      transactions: T[]
    ): Promise<T[]> {
      const { signedTransactions } = await dynamicSignAllTransactions({
        walletAccount: wallet,
        transactions: transactions as any[], // Version mismatch workaround
      });
      return signedTransactions as unknown as T[];
    },

    /**
     * Sign and send a transaction using Dynamic SDK
     * @see https://www.dynamic.xyz/docs/javascript-sdk/solana/signing-and-sending-transactions
     */
    async sendTransaction(
      transaction: Transaction | VersionedTransaction
    ): Promise<string> {
      const { signature } = await signAndSendTransaction({
        walletAccount: wallet,
        transaction: transaction as any, // Version mismatch workaround
      });
      return signature;
    },

    // Event handlers (required by interface, no-ops for our use case)
    on: () => {},
    off: () => {},
    once: () => {},
    emit: () => false,
    removeListener: () => {},
    removeAllListeners: () => {},
    addListener: () => {},
    listenerCount: () => 0,
    listeners: () => [],
    eventNames: () => [],
    rawListeners: () => [],
    prependListener: () => {},
    prependOnceListener: () => {},
    setMaxListeners: () => {},
    getMaxListeners: () => 10,
  } as unknown as SignerWalletAdapter;
}

/**
 * Find Solana wallet matching the route's fromAddress.
 * Ensures we use the same wallet that was used for the quote.
 *
 * @param routeFromAddress - Address from the LI.FI route
 * @returns Matching Solana wallet
 * @throws Error if wallet not found
 */
export function findSolanaWallet(routeFromAddress: string): SolanaWallet {
  const allWallets = getWalletAccounts();
  const solanaWallet = allWallets
    .filter(isSolanaWallet)
    .find((w) => w.address === routeFromAddress);

  if (!solanaWallet) {
    console.error("[LI.FI] Solana wallet mismatch:", {
      routeFromAddress,
      availableWallets: allWallets
        .filter(isSolanaWallet)
        .map((w) => ({ address: w.address, provider: w.walletProviderKey })),
    });
    throw new Error(
      "Solana wallet not found. The wallet used for the quote may have been disconnected."
    );
  }

  return solanaWallet;
}

/**
 * Build Solana provider configuration for LI.FI SDK.
 *
 * @param routeFromAddress - Source address from the route
 * @returns Provider config and RPC URLs
 */
export async function buildSolanaProvider(routeFromAddress: string): Promise<{
  provider: ReturnType<typeof Solana>;
  rpcUrls: Record<number, string[]>;
}> {
  const wallet = findSolanaWallet(routeFromAddress);
  const connection = await getSolanaConnection(wallet);
  const adapter = createSolanaAdapter(wallet);

  return {
    provider: Solana({
      getWalletAdapter: async () => adapter as any,
    }),
    rpcUrls: { [LIFI_SOLANA_CHAIN_ID]: [connection.rpcEndpoint] },
  };
}

/**
 * Parameters for direct Solana token transfer
 */
export interface SolanaTransferParams {
  /** Token mint address (empty string for native SOL) */
  tokenMint: string;
  tokenDecimals: number;
  /** Human-readable amount (e.g., "0.5") */
  amount: string;
  toAddress: string;
}

/**
 * Execute a direct Solana token transfer (native SOL or SPL token).
 * Uses Dynamic SDK's signAndSendTransaction for wallet interaction.
 *
 * @see https://www.dynamic.xyz/docs/javascript-sdk/solana/signing-and-sending-transactions
 */
export async function executeSolanaTransfer(
  params: SolanaTransferParams,
  options?: ExecuteSwapOptions
): Promise<boolean> {
  const { onUpdate, onRejected, onError } = options || {};
  const { tokenMint, tokenDecimals, amount, toAddress } = params;

  try {
    const wallet = getSolanaWalletAccount();
    if (!wallet) throw new Error("No Solana wallet connected");

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "ACTION_REQUIRED",
    });

    // Get connection for building transaction
    const connection = await getSolanaConnection(wallet);

    // Convert amount to smallest unit (lamports for SOL, or token decimals)
    const amountInSmallestUnit = Math.floor(
      parseFloat(amount) * Math.pow(10, tokenDecimals)
    );

    // Build the transaction
    const fromPubkey = new PublicKey(wallet.address);
    const toPubkey = new PublicKey(toAddress);

    let transaction: Transaction;

    if (!tokenMint) {
      // Native SOL transfer
      transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amountInSmallestUnit,
        })
      );
    } else {
      // SPL Token transfer
      const mintPubkey = new PublicKey(tokenMint);

      // Get or create associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        fromPubkey
      );
      const toTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        toPubkey
      );

      transaction = new Transaction();

      // Check if recipient's token account exists, create if not
      try {
        await getAccount(connection as any, toTokenAccount);
      } catch {
        // Account doesn't exist, add instruction to create it
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPubkey, // payer
            toTokenAccount, // associated token account
            toPubkey, // owner
            mintPubkey // mint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          BigInt(amountInSmallestUnit)
        )
      );
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "RUNNING",
    });

    // Sign and send using Dynamic SDK
    const { signature } = await signAndSendTransaction({
      walletAccount: wallet,
      transaction: transaction as any, // Version mismatch workaround
    });

    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "DONE",
      txHash: signature,
    });

    return true;
  } catch (err) {
    const isRejection = isUserRejection(err);

    if (isRejection) {
      onRejected?.();
      // Don't call onUpdate for user rejections - onRejected handles it
      return false;
    }

    onError?.();
    onUpdate?.({
      stepIndex: 0,
      totalSteps: 1,
      processType: "TRANSFER",
      status: "FAILED",
    });

    return false;
  }
}
