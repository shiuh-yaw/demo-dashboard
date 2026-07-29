"use client";

/**
 * "Card balance" row - Rain's spending-power balance
 * (`useBalance`, dashboard-mediated read, hard rule 3), restyled to
 * wallet's row idiom (apps/wallet/components/wallet/wallet-row.tsx).
 */

import { DollarSign, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton, Tooltip } from "@dynamic-demos/ui";
import { cn, formatCurrency } from "@dynamic-demos/utils";

import { useBalance } from "@/hooks/use-balance";

export interface CardBalanceRowProps {
  enabled: boolean;
}

export function CardBalanceRow({ enabled }: CardBalanceRowProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isRefetching, refetch } =
    useBalance(enabled);

  const handleRefresh = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["rain", "transactions"] }),
    ]);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "px-3 py-2.5",
        "bg-(--brand-row-bg) rounded-(--brand-radius)",
        "transition-colors hover:bg-(--brand-row-hover)",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-(--brand-surface) border border-(--brand-border) flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-(--brand-fg)" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
            Card balance
          </p>
          <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
            Available to spend
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : isError ? (
          <Tooltip content="Couldn't reach this card">
            <span className="text-sm font-medium text-(--brand-muted)">
              Unavailable
            </span>
          </Tooltip>
        ) : (
          <span className="text-sm font-medium text-(--brand-fg) tabular-nums">
            {formatCurrency((data?.spendingPower ?? 0) / 100)}
          </span>
        )}
        <Tooltip content="Refresh balance">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefetching}
            className="p-1.5 rounded-full transition-colors cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-black/5 disabled:opacity-50"
            aria-label="Refresh balance"
          >
            <RefreshCw
              className={cn("w-4 h-4", isRefetching && "animate-spin")}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
