"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { MorphoVault } from "@/lib/api/vaults";

function formatAmount(
  raw: string | number | null | undefined,
  decimals: number,
  symbol: string,
): string {
  if (raw == null) return "--";
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (Number.isNaN(n)) return "--";
  const divisor = 10 ** decimals;
  const value = n / divisor;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ${symbol}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ${symbol}`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K ${symbol}`;
  return `${value.toFixed(2)} ${symbol}`;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return "";
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

interface VaultListProps {
  vaults: MorphoVault[];
  onVaultClick: (vault: MorphoVault) => void;
  /** Custom message when vault list is empty (e.g. when filtered by mock balances) */
  emptyMessage?: string;
}

export function VaultList({ vaults, onVaultClick, emptyMessage }: VaultListProps) {
  if (!vaults.length) {
    return (
      <div className="rounded-2xl p-8 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <p className="text-trade-text-muted">
          {emptyMessage ?? "No vaults available for this network"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-trade-border/50 bg-trade-bg/30">
              <th className="text-left py-3 px-4 text-xs font-medium text-trade-text-muted">
                Vault
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                Deposits
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                Liquidity
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-trade-text-muted">
                Exposure
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-trade-text-muted">
                APY
              </th>
            </tr>
          </thead>
          <tbody>
            {vaults.map((vault) => {
              const apy = vault.state?.netApy ?? vault.state?.dailyApy ?? null;
              const deposits = vault.state?.totalAssets
                ? formatAmount(
                    vault.state.totalAssets,
                    vault.asset.decimals,
                    vault.asset.symbol,
                  )
                : "--";
              const depositsUsd = formatUsd(vault.state?.totalAssetsUsd ?? null);
              const liquidityUsd = vault.state?.liquidityUsd ?? vault.state?.totalAssetsUsd;
              const totalAssetsUsd = vault.state?.totalAssetsUsd;
              const totalAssets = Number(vault.state?.totalAssets ?? 0);
              const liquidity =
                liquidityUsd != null && totalAssetsUsd != null && totalAssets > 0
                  ? formatAmount(
                      String(
                        Math.round(
                          (liquidityUsd / totalAssetsUsd) * totalAssets,
                        ),
                      ),
                      vault.asset.decimals,
                      vault.asset.symbol,
                    )
                  : liquidityUsd != null
                    ? formatUsd(liquidityUsd)
                    : "--";
              const liquidityUsdStr =
                liquidityUsd != null ? formatUsd(liquidityUsd) : "";
              const exposureAssets = vault.exposureAssets ?? [];
              const maxIcons = 5;
              const visibleAssets = exposureAssets.slice(0, maxIcons);
              const overflowCount = exposureAssets.length - maxIcons;

              return (
                <tr
                  key={vault.id}
                  className="border-b border-trade-border/40 last:border-0 hover:bg-trade-surface-elevated transition-colors group cursor-pointer"
                  onClick={() => onVaultClick(vault)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3 group-hover:opacity-80 transition-opacity">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-trade-bg shrink-0">
                        {vault.asset.logoURI ? (
                          <Image
                            src={vault.asset.logoURI}
                            alt={vault.asset.name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-medium text-trade-text-muted">
                            {vault.asset.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-medium text-trade-text-primary">
                            {vault.name}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-trade-accent/20 text-trade-accent border border-trade-accent/30">
                          V2
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm text-trade-text-secondary tabular-nums">
                      {deposits}
                    </div>
                    {depositsUsd && (
                      <div className="text-xs text-trade-text-muted tabular-nums">
                        {depositsUsd}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm text-trade-text-secondary tabular-nums">
                      {liquidity}
                    </div>
                    {liquidityUsdStr && !liquidity.startsWith("$") && (
                      <div className="text-xs text-trade-text-muted tabular-nums">
                        {liquidityUsdStr}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center -space-x-2">
                      {visibleAssets.length > 0 ? (
                        <>
                          {visibleAssets.map((a) => (
                            <div
                              key={a.symbol}
                              className="relative h-6 w-6 rounded-full overflow-hidden bg-trade-bg shrink-0 flex items-center justify-center"
                            >
                              {a.logoURI ? (
                                <Image
                                  src={a.logoURI}
                                  alt={a.symbol}
                                  width={24}
                                  height={24}
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-medium text-trade-text-muted">
                                  {a.symbol.slice(0, 2)}
                                </span>
                              )}
                            </div>
                          ))}
                          {overflowCount > 0 && (
                            <span className="ml-2.5 text-xs font-medium text-trade-text-muted">
                              +{overflowCount}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="relative h-6 w-6 rounded-full overflow-hidden bg-trade-bg shrink-0 flex items-center justify-center">
                          {vault.asset.logoURI ? (
                            <Image
                              src={vault.asset.logoURI}
                              alt={vault.asset.symbol}
                              width={24}
                              height={24}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-trade-text-muted">
                              {vault.asset.symbol.slice(0, 2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-trade-text-primary tabular-nums">
                      {formatApy(apy)}
                      <Sparkles className="w-3.5 h-3.5 text-trade-accent" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
