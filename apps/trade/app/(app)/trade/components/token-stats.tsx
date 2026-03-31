"use client";

import { useTokenStats } from "@/hooks/use-token-stats";

function formatCompact(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1000)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1)
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

interface TokenStatsProps {
  symbol: string;
}

export function TokenStats({ symbol }: TokenStatsProps) {
  const { data: stats, isLoading } = useTokenStats(symbol);

  if (isLoading || !stats) {
    return (
      <div className="rounded-2xl bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
        <h3 className="text-sm font-medium text-trade-text-secondary mb-3">
          Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-20 rounded bg-trade-border/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { label: "TVL", value: "--" },
    { label: "Market cap", value: formatCompact(stats.marketCap) },
    { label: "FDV", value: formatCompact(stats.fdv) },
    { label: "1 day volume", value: formatCompact(stats.totalVolume) },
    { label: "52W High", value: formatPrice(stats.ath) },
    { label: "52W Low", value: formatPrice(stats.atl) },
  ];

  return (
    <div className="rounded-2xl bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
      <h3 className="text-sm font-medium text-trade-text-secondary mb-3">
        Stats
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-trade-text-muted">{item.label}</span>
            <span className="text-sm font-medium text-trade-text-primary tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
