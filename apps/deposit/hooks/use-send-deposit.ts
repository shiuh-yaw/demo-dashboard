"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getExternalEvmWalletAccount,
  getNetworksData,
  type NetworkData,
} from "@/lib/dynamic";
import { sendDeposit } from "@/lib/send-deposit";
import {
  DEPOSIT_CHAIN_IDS,
  chainIdFromNetworkId,
  type DepositNetwork,
} from "@/lib/deposit-network";

function findNetworkData(network: DepositNetwork): NetworkData | null {
  const targetChainId = DEPOSIT_CHAIN_IDS[network];
  const networks = getNetworksData();
  return (
    networks.find((n) => chainIdFromNetworkId(n.networkId) === targetChainId) ??
    null
  );
}

export interface UseSendDepositResult {
  /** The connected external wallet address, or null if unavailable. */
  externalWalletAddress: string | null;
  /** Send USDC from the external wallet to the vault deposit address. */
  send: (amount: string) => Promise<void>;
  isSending: boolean;
  /** Tx hash on success. */
  txHash: string | null;
  error: string | null;
  clearError: () => void;
}

export function useSendDeposit(
  depositAddress: string,
  network: DepositNetwork,
): UseSendDepositResult {
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const externalWallet = useMemo(() => getExternalEvmWalletAccount(), []);

  const send = useCallback(
    async (amount: string) => {
      setError(null);
      setTxHash(null);

      if (!externalWallet) {
        setError("No external wallet connected. Please reconnect.");
        return;
      }

      const networkData = findNetworkData(network);
      if (!networkData) {
        setError(
          `Network configuration not found for ${network}. Check Dynamic dashboard settings.`,
        );
        return;
      }

      if (!depositAddress) {
        setError("No deposit address available.");
        return;
      }

      setIsSending(true);
      try {
        const hash = await sendDeposit({
          walletAccount: externalWallet,
          depositAddress: depositAddress as `0x${string}`,
          amount,
          network,
          networkData,
        });
        setTxHash(hash);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        if (
          msg.includes("User rejected") ||
          msg.includes("user rejected") ||
          msg.includes("User denied")
        ) {
          setError("Transaction cancelled.");
        } else {
          setError(msg);
        }
      } finally {
        setIsSending(false);
      }
    },
    [externalWallet, depositAddress, network],
  );

  return {
    externalWalletAddress: externalWallet?.address ?? null,
    send,
    isSending,
    txHash,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
