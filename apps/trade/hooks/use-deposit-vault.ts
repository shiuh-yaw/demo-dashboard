"use client";

import { useState, useCallback } from "react";
import { parseUnits } from "viem";
import {
  createWalletClientForWalletAccount,
  switchActiveNetwork,
  getWalletAccounts,
  isEvmWalletAccount,
} from "@/lib/dynamic";
import { getPublicClient } from "@/lib/chains";
import { ERC20_APPROVE_ABI, ERC4626_DEPOSIT_ABI } from "@/lib/contracts/morpho";
import type { MorphoVault } from "@/lib/api/vaults";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockBalances } from "@/hooks/use-mock-balances";
import {
  MOCK_METADATA_KEYS,
  type MockVaultPosition,
} from "@/lib/mock-metadata";

export interface UseDepositVaultResult {
  deposit: (amount: string) => Promise<string | null>;
  isPending: boolean;
  error: string | null;
  txHash: string | null;
  reset: () => void;
}

export function useDepositVault(vault: MorphoVault | null): UseDepositVaultResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { isMockMode } = useMockMode();
  const { metadata, updateMetadata } = useMockMetadata();
  const { getBalance, deductBalance } = useMockBalances();

  const reset = useCallback(() => {
    setError(null);
    setTxHash(null);
  }, []);

  const deposit = useCallback(
    async (amount: string): Promise<string | null> => {
      if (!vault) {
        setError("No vault selected");
        return null;
      }

      const amountNum = parseFloat(amount);
      if (Number.isNaN(amountNum) || amountNum <= 0) {
        setError("Enter a valid amount");
        return null;
      }

      setError(null);
      setTxHash(null);
      setIsPending(true);

      // Mock mode: deduct from balances, store deposit in metadata
      if (isMockMode) {
        try {
          const assetSymbol = vault.asset.symbol.toUpperCase();
          const balance = getBalance(assetSymbol);
          if (balance < amountNum) {
            setError(`Insufficient ${assetSymbol} balance. You have ${balance.toFixed(2)}.`);
            setIsPending(false);
            return null;
          }
          const deducted = await deductBalance(assetSymbol, amountNum);
          if (!deducted) {
            setError(`Insufficient ${assetSymbol} balance`);
            setIsPending(false);
            return null;
          }
          const earn = (metadata[MOCK_METADATA_KEYS.EARN] ?? {}) as {
            deposits?: MockVaultPosition[];
          };
          const deposits = earn.deposits ?? [];
          const existing = deposits.find(
            (d) =>
              d.vaultAddress === vault.address &&
              d.chainId === vault.chainId,
          );
          const apy =
            vault.state?.netApy ?? vault.state?.dailyApy ?? null;
          const newPosition: MockVaultPosition = {
            id: existing
              ? existing.id
              : `${vault.address}-${vault.chainId}-${Date.now()}`,
            vaultAddress: vault.address,
            vaultName: vault.name,
            chainId: vault.chainId,
            assetSymbol: vault.asset.symbol,
            assetName: vault.asset.name,
            assetLogoURI: vault.asset.logoURI ?? null,
            amount: existing
              ? String(parseFloat(existing.amount) + amountNum)
              : amount,
            apy,
            depositedAt: existing ? existing.depositedAt : new Date().toISOString(),
          };
          const updatedDeposits = existing
            ? deposits.map((d) =>
                d.vaultAddress === vault.address && d.chainId === vault.chainId
                  ? newPosition
                  : d,
              )
            : [...deposits, newPosition];
          await updateMetadata.mutateAsync({
            [MOCK_METADATA_KEYS.EARN]: {
              deposits: updatedDeposits,
            },
          });
          setIsPending(false);
          return "mock-tx";
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Mock deposit failed";
          setError(message);
          setIsPending(false);
          return null;
        }
      }

      const assetAddress = vault.asset.address;
      if (!assetAddress) {
        setError("Vault asset address not available. Try another vault.");
        return null;
      }

      const accounts = getWalletAccounts();
      const evmAccount = accounts.find(isEvmWalletAccount);
      if (!evmAccount) {
        setError("Connect an EVM wallet to deposit");
        return null;
      }

      try {
        const amountWei = parseUnits(amount, vault.asset.decimals);
        const vaultAddress = vault.address as `0x${string}`;
        const assetAddressHex = assetAddress as `0x${string}`;
        const receiver = evmAccount.address as `0x${string}`;

        await switchActiveNetwork({
          walletAccount: evmAccount,
          networkId: String(vault.chainId),
        });

        const walletClient = await createWalletClientForWalletAccount({
          walletAccount: evmAccount,
        });

        const publicClient = getPublicClient(vault.chainId);

        // Check allowance
        const allowance = await publicClient.readContract({
          address: assetAddressHex,
          abi: ERC20_APPROVE_ABI,
          functionName: "allowance",
          args: [receiver, vaultAddress],
        });

        if (allowance < amountWei) {
          const approveHash = await walletClient.writeContract({
            address: assetAddressHex,
            abi: ERC20_APPROVE_ABI,
            functionName: "approve",
            args: [vaultAddress, amountWei],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        const depositHash = await walletClient.writeContract({
          address: vaultAddress,
          abi: ERC4626_DEPOSIT_ABI,
          functionName: "deposit",
          args: [amountWei, receiver],
        });

        await publicClient.waitForTransactionReceipt({ hash: depositHash });
        setTxHash(depositHash);
        return depositHash;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Deposit failed";
        setError(message);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [
      vault,
      isMockMode,
      metadata,
      updateMetadata,
    ]
  );

  return { deposit, isPending, error, txHash, reset };
}
