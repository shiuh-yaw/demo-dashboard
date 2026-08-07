"use client";

/**
 * Reads and writes for acting WITH a wallet, as opposed to administering it.
 *
 * None of these are gated on step-up: the elevated token protects changes to
 * who can sign, not signing itself. Holding a share is the authorization.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMilestone } from "@/hooks/use-milestone";
import {
  canSponsorSolanaTransfer,
  canSponsorTransfer,
  getNativeBalance,
  getTokenBalances,
  getTransactionHistory,
  sendSponsoredSolanaTransfer,
  sendSponsoredTransfer,
  signMessage,
  switchActiveNetwork,
  transferAmount,
  type Chain,
  type SendStage,
  type TokenBalance,
  type WalletAccount,
} from "@/lib/dynamic";

/** Transactions per page in the history list. */
export const HISTORY_PAGE_SIZE = 10;

/**
 * Native currency balance, as a decimal string.
 *
 * Keyed by network as well as address: switching networks must not show the
 * previous network's balance while the new one loads.
 */
export function useNativeBalance(
  walletAccount: WalletAccount | null,
  networkId: string | number | undefined,
) {
  return useQuery({
    queryKey: ["native-balance", walletAccount?.address, String(networkId)],
    queryFn: () =>
      walletAccount ? getNativeBalance({ walletAccount }) : Promise.resolve(null),
    enabled: Boolean(walletAccount),
  });
}

/** Tokens held on the wallet's current network, native included. */
export function useTokenBalances(
  walletAccount: WalletAccount | null,
  networkId: string | number | undefined,
) {
  return useQuery<TokenBalance[]>({
    queryKey: ["token-balances", walletAccount?.address, String(networkId)],
    queryFn: () =>
      walletAccount
        ? getTokenBalances({
            walletAccount,
            networkId: networkId == null ? undefined : Number(networkId),
          })
        : Promise.resolve([]),
    enabled: Boolean(walletAccount),
  });
}

/** One page of history. `offset` comes from the previous page's `nextOffset`. */
export function useTransactionHistory(params: {
  address: string | undefined;
  chain: string | undefined;
  networkId: number | undefined;
  offset?: string;
}) {
  const { address, chain, networkId, offset } = params;

  return useQuery({
    queryKey: ["tx-history", address, chain, networkId, offset],
    queryFn: () =>
      getTransactionHistory({
        address: address as string,
        chain: chain as Chain,
        networkId: networkId as number,
        limit: HISTORY_PAGE_SIZE,
        offset,
      }),
    enabled: Boolean(address && chain && networkId != null),
  });
}

/**
 * Move a wallet to another network.
 *
 * Invalidates balances and history rather than refetching them here, so the
 * screens that are mounted re-read and the ones that are not stay cold.
 */
export function useSwitchNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { walletAccount: WalletAccount; networkId: string }) =>
      switchActiveNetwork(input),
    onSuccess: () => {
      for (const key of ["native-balance", "token-balances", "tx-history"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      // The SDK's own active-network cache is namespaced; match by segment.
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some(
            (segment) =>
              typeof segment === "string" && segment.includes("ActiveNetwork"),
          ),
      });
    },
  });
}

/**
 * Send from a wallet.
 *
 * Balances are invalidated on success but history is not refetched
 * immediately: the indexer has not seen the transaction yet at the moment it
 * is submitted, so an instant refetch returns the same page and reads as the
 * send having failed. The success screen shows the hash, which is the
 * authoritative receipt; history catches up on the next visit.
 */
export function useSendTransaction() {
  const queryClient = useQueryClient();
  const milestone = useMilestone();

  return useMutation({
    mutationFn: (input: {
      walletAccount: WalletAccount;
      amount: string;
      recipient: string;
      token?: { address: string; decimals: number };
      /** Decimals of the chain's native currency, for the sponsored path. */
      nativeDecimals?: number;
      /** Active network RPC, required only for the sponsored Solana path. */
      rpcUrl?: string;
      /** Reports real progress; only the sponsored EVM path has stages. */
      onStage?: (stage: SendStage) => void;
      /** Reported to analytics as shape only; never an address or amount. */
      chain: string;
      isNative: boolean;
    }) => {
      // Sponsored when the project allows it and the chain is EVM, so a
      // treasury holding only USDC can still move it. `transferAmount` would
      // make the wallet pay its own gas, which for these wallets is usually
      // the difference between working and not.
      // Solana sponsorship replaces the fee payer server-side rather than
      // delegating, so it needs the transaction built here - see
      // `lib/dynamic/gasless-solana.ts`. Falls through when there is no RPC to
      // build against.
      if (canSponsorSolanaTransfer(input.walletAccount) && input.rpcUrl) {
        return sendSponsoredSolanaTransfer({
          walletAccount: input.walletAccount,
          amount: input.amount,
          recipient: input.recipient,
          token: input.token,
          rpcUrl: input.rpcUrl,
        });
      }
      if (canSponsorTransfer(input.walletAccount)) {
        return sendSponsoredTransfer({
          walletAccount: input.walletAccount,
          amount: input.amount,
          recipient: input.recipient,
          token: input.token,
          nativeDecimals: input.nativeDecimals,
          onStage: input.onStage,
        });
      }
      return transferAmount({
        walletAccount: input.walletAccount,
        amount: input.amount,
        recipient: input.recipient,
        token: input.token,
      });
    },
    onSuccess: (_result, input) => {
      milestone("wallet_transfer_sent", {
        chain: input.chain,
        asset: input.isNative ? "native" : "token",
        sponsored:
          canSponsorTransfer(input.walletAccount) ||
          canSponsorSolanaTransfer(input.walletAccount),
      });
      queryClient.invalidateQueries({ queryKey: ["native-balance"] });
      queryClient.invalidateQueries({ queryKey: ["token-balances"] });
    },
  });
}

/**
 * Sign an arbitrary message.
 *
 * Nothing to invalidate: signing reads the key and changes no server state,
 * which is exactly what makes it the cleanest proof that a co-signed wallet
 * can sign at all.
 */
export function useSignMessage() {
  const milestone = useMilestone();

  return useMutation({
    mutationFn: (input: { walletAccount: WalletAccount; message: string }) =>
      signMessage(input),
    onSuccess: (_result, input) => {
      // Length only - the message itself is the user's content.
      milestone("wallet_message_signed", {
        chain: input.walletAccount.chain,
      });
    },
  });
}
