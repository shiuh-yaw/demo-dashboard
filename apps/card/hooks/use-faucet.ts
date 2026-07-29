"use client";

/**
 * Test-token faucet: mint FAUCET_DOLLARS of RUSDC to the user's embedded
 * wallet on Base Sepolia, gaslessly via Dynamic's native EVM Gas Sponsorship
 * (sendSponsoredTransaction; EIP-7702, no ZeroDev).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendSponsoredTransaction,
  isEvmWalletAccount,
  SponsorTransactionError,
} from "@dynamic-labs-sdk/evm";
import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import { useTrack } from "@dynamic-demos/analytics";

import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { buildMintCalls } from "@/lib/gasless/build-calls";
import { ensureBaseSepolia } from "@/lib/gasless/ensure-base-sepolia";
import { FAUCET_DOLLARS } from "@/lib/constants";
import { useBalanceWatch } from "@/contexts/balance-watch-context";
import { useWidgetNotice } from "@/contexts/widget-notice-context";

interface UseFaucetResult {
  mint: () => Promise<void>;
  isMinting: boolean;
  error: string | null;
  txHash: string | null;
}

export function useFaucet(): UseFaucetResult {
  const queryClient = useQueryClient();
  const { milestone } = useTrack();
  const { startWatch } = useBalanceWatch();
  const { notify } = useWidgetNotice();
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  // useGetWalletAccounts' return type is hardcoded to BaseWalletAccount<Chain>
  // rather than the module-augmented WalletAccount alias - cast to bridge it
  // (same fix as apps/wallet/hooks/use-wallet-accounts.ts).
  const walletAccount = (walletAccounts as WalletAccount[]).find(isEvmWalletAccount);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!walletAccount) throw new Error("No EVM wallet found");
      // Sponsored txs target the wallet's active network - pin it to Base
      // Sepolia so the mint lands on the card's chain, not the env default.
      await ensureBaseSepolia(walletAccount);
      const { transactionHash } = await sendSponsoredTransaction({
        walletAccount,
        calls: buildMintCalls(),
      });
      return transactionHash;
    },
    onSuccess: () => {
      milestone("usdc_minted");
      notify(`Received $${FAUCET_DOLLARS} test USDC`);
      startWatch();
      queryClient.invalidateQueries({ queryKey: ["rusdc"] });
    },
  });

  const message = mutation.error
    ? mutation.error instanceof SponsorTransactionError
      ? "Gas sponsorship failed. Try again."
      : mutation.error instanceof Error
        ? mutation.error.message
        : "Failed to mint test USDC"
    : null;

  return {
    mint: async () => {
      await mutation.mutateAsync();
    },
    isMinting: mutation.isPending,
    error: message,
    txHash: mutation.data ?? null,
  };
}
