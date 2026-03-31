"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
} from "@dynamic-demos/ui";
import { useDepositVault } from "@/hooks/use-deposit-vault";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockBalances } from "@/hooks/use-mock-balances";
import type { MorphoVault } from "@/lib/api/vaults";

const CHAIN_EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
};

function formatTvl(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatApy(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

interface VaultModalProps {
  vault: MorphoVault | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultModal({ vault, open, onOpenChange }: VaultModalProps) {
  const [amount, setAmount] = useState("");
  const [vaultWithAsset, setVaultWithAsset] = useState<MorphoVault | null>(
    null,
  );

  const { isMockMode } = useMockMode();
  const { getBalance } = useMockBalances();
  const { deposit, isPending, error, txHash, reset } = useDepositVault(
    isMockMode ? vault : vaultWithAsset,
  );

  // Fetch vault detail when opening to ensure we have asset.address
  useEffect(() => {
    if (!open || !vault) {
      setVaultWithAsset(null);
      setAmount("");
      reset();
      return;
    }
    if (vault.asset.address) {
      setVaultWithAsset(vault);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/earn/vault?address=${encodeURIComponent(vault.address)}&chainId=${vault.chainId}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setVaultWithAsset(data);
        else if (!cancelled) setVaultWithAsset(vault);
      })
      .catch(() => {
        if (!cancelled) setVaultWithAsset(vault);
      });
    return () => {
      cancelled = true;
    };
  }, [open, vault, reset]);

  if (!vault) return null;

  const apy = vault.state?.netApy ?? vault.state?.dailyApy ?? null;
  const explorerBase = CHAIN_EXPLORERS[vault.chainId];
  const txExplorerUrl =
    txHash &&
    txHash !== "mock-tx" &&
    explorerBase
      ? `${explorerBase}/tx/${txHash}`
      : null;
  const walletBalance = isMockMode ? getBalance(vault.asset.symbol) : Infinity;
  const amountNum = parseFloat(amount) || 0;
  const canDeposit =
    (vaultWithAsset?.asset.address || isMockMode) &&
    amountNum > 0 &&
    amountNum <= walletBalance;

  const handleDeposit = async () => {
    if (!canDeposit) return;
    const hash = await deposit(amount);
    if (hash) {
      setAmount("");
      if (hash === "mock-tx") onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-trade-surface border-trade-border text-trade-text-primary"
        showCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-trade-surface border border-trade-border/50 shrink-0">
              {vault.asset.logoURI ? (
                <Image
                  src={vault.asset.logoURI}
                  alt={vault.asset.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-medium text-trade-text-muted">
                  {vault.asset.symbol.slice(0, 2)}
                </div>
              )}
            </div>
            <div>
              <DialogTitle className="text-lg text-trade-text-primary">
                {vault.name}
              </DialogTitle>
              <p className="text-sm text-trade-text-muted">
                {vault.asset.name} ({vault.asset.symbol})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">APY</p>
              <p className="text-lg font-semibold text-trade-accent tabular-nums">
                {formatApy(apy)}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">TVL</p>
              <p className="text-lg font-semibold text-trade-text-primary tabular-nums">
                {formatTvl(vault.state?.totalAssetsUsd ?? null)}
              </p>
            </div>
          </div>

          {!vaultWithAsset?.asset.address && !isMockMode ? (
            <div className="rounded-lg p-3 bg-trade-surface-blue/50 border border-trade-border/50 text-sm text-trade-text-muted">
              Loading vault details…
            </div>
          ) : (
            <>
              <div>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  label={
                    <span className="flex items-center justify-between w-full">
                      <span className="text-trade-text-primary">
                        Amount ({vault.asset.symbol})
                      </span>
                      {isMockMode && (
                        <span className="text-xs text-trade-text-muted font-normal">
                          Balance:{" "}
                          {getBalance(vault.asset.symbol).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            },
                          )}{" "}
                          {vault.asset.symbol}
                        </span>
                      )}
                    </span>
                  }
                  error={error ?? undefined}
                  className="bg-trade-surface border-trade-border text-trade-text-primary placeholder:text-trade-text-muted"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleDeposit}
                  disabled={!canDeposit || isPending}
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Depositing…
                    </>
                  ) : (
                    "Deposit"
                  )}
                </Button>

                {txHash && (
                  <a
                    href={txExplorerUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-trade-accent hover:underline"
                  >
                    View transaction
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
