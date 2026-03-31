"use client";

import { useTokenStats } from "@/hooks/use-token-stats";

interface TokenAboutProps {
  symbol: string;
}

export function TokenAbout({ symbol }: TokenAboutProps) {
  const { data: stats, isLoading } = useTokenStats(symbol);

  if (isLoading || !stats) {
    return (
      <div className="rounded-2xl bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
        <h3 className="text-sm font-medium text-trade-text-secondary mb-3">
          About
        </h3>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-trade-border/50 animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-trade-border/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const description = stats.description
    ? stats.description.replace(/<[^>]*>/g, "").slice(0, 400)
    : null;

  return (
    <div className="rounded-2xl bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4">
      <h3 className="text-sm font-medium text-trade-text-secondary mb-3">
        About
      </h3>
      {description ? (
        <p className="text-sm text-trade-text-secondary leading-relaxed">
          {description}
          {stats.description && stats.description.length > 400 ? "..." : ""}
        </p>
      ) : (
        <p className="text-sm text-trade-text-muted">
          No description available for {stats.name}.
        </p>
      )}
    </div>
  );
}
