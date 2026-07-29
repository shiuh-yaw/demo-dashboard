"use client";

/**
 * Fund the Rain card: transfer RUSDC from the user's embedded wallet to their
 * Rain deposit address on Base Sepolia, gaslessly. Uses Dynamic's native EVM
 * Gas Sponsorship (sendSponsoredTransaction) - EIP-7702 under the hood, no
 * ZeroDev. The deposit address comes from the dashboard /api/rain/contracts
 * (hard rule 3: the app never calls Rain directly).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sendSponsoredTransaction,
  isEvmWalletAccount,
  SponsorTransactionError,
} from "@dynamic-labs-sdk/evm";
import { useDynamicClient, useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import type { UserDepositContractResponse } from "@dynamic-demos/rain";

import { dashboardGet, dashboardPost } from "@/lib/dashboard-api";
import { useRainCardStore, rainCardRef } from "@dynamic-demos/rain/client";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { BASE_SEPOLIA_ID } from "@/lib/constants";
import { buildTransferCalls } from "@/lib/gasless/build-calls";
import { ensureBaseSepolia } from "@/lib/gasless/ensure-base-sepolia";
import { useBalanceWatch } from "@/contexts/balance-watch-context";
import { useWidgetNotice } from "@/contexts/widget-notice-context";

interface UseFundCardResult {
  fund: (amount: string) => Promise<void>;
  isFunding: boolean;
  error: string | null;
  txHash: string | null;
}

export function useFundCard(): UseFundCardResult {
  const queryClient = useQueryClient();
  const client = useDynamicClient();
  const { card } = useRainCardStore();
  const { startWatch } = useBalanceWatch();
  const { notify } = useWidgetNotice();
  const { data: walletAccounts = [] } = useGetWalletAccounts();
  // useGetWalletAccounts' return type is hardcoded to BaseWalletAccount<Chain>
  // rather than the module-augmented WalletAccount alias - cast to bridge it
  // (same fix as apps/wallet/hooks/use-wallet-accounts.ts).
  const walletAccount = (walletAccounts as WalletAccount[]).find(isEvmWalletAccount);

  const mutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!walletAccount) throw new Error("No EVM wallet found");

      const token = client?.token;
      const cardRef = rainCardRef(card);
      const contracts = await dashboardGet<UserDepositContractResponse[]>(
        "/api/rain/contracts",
        token,
        cardRef,
      );
      let depositAddress = contracts.find((c) => c.chainId === BASE_SEPOLIA_ID)
        ?.depositAddress;
      if (!depositAddress) {
        const created = await dashboardPost<UserDepositContractResponse>(
          "/api/rain/contracts",
          token,
          { chainId: BASE_SEPOLIA_ID },
          cardRef,
        );
        depositAddress = created.depositAddress;
      }
      if (!depositAddress) throw new Error("No deposit address was returned");

      // Sponsored txs target the wallet's active network - pin it to Base
      // Sepolia so the transfer lands on the card's chain, not the env default.
      await ensureBaseSepolia(walletAccount);
      const { transactionHash } = await sendSponsoredTransaction({
        walletAccount,
        calls: buildTransferCalls(depositAddress, amount),
      });
      return transactionHash;
    },
    onSuccess: (_txHash, amount) => {
      notify(`Deposited $${amount} to your card`);
      startWatch();
      queryClient.invalidateQueries({ queryKey: ["rain", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["rain", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["rusdc"] });
    },
  });

  const message = mutation.error
    ? mutation.error instanceof SponsorTransactionError
      ? "Gas sponsorship failed. Try again."
      : mutation.error instanceof Error
        ? mutation.error.message
        : "Failed to fund card"
    : null;

  return {
    fund: async (amount) => {
      await mutation.mutateAsync(amount);
    },
    isFunding: mutation.isPending,
    error: message,
    txHash: mutation.data ?? null,
  };
}
