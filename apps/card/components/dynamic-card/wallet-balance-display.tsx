"use client";

/**
 * "Available to fund" row - the user's RUSDC wallet balance (the funding
 * source for the card), restyled to wallet's row idiom
 * (apps/wallet/components/wallet/wallet-row.tsx). Reused on both the main
 * screen and the deposit screen. Reads the balance via `useRusdcBalance` - a
 * direct viem `balanceOf` call on Base Sepolia, since Dynamic's balance API
 * does not cover that chain.
 */

import { useEffect } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { Skeleton, Tooltip } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";

import { useRusdcBalance } from "@/hooks/use-rusdc-balance";
import { useEvmWalletAccount } from "@/hooks/use-evm-wallet-account";
import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import { maybeTrackWalletFunded } from "@/lib/analytics/milestones";
import { WalletAddress } from "@/components/dynamic-card/wallet-address";

export interface AvailableToFundRowProps {
  className?: string;
}

export function AvailableToFundRow({ className }: AvailableToFundRowProps) {
  const walletAccount = useEvmWalletAccount();
  const address = walletAccount?.address;
  const { formatted, isLoading, isRefetching, refetch } = useRusdcBalance(
    address,
  );

  // `wallet_funded` - first time the RUSDC funding balance is observed > 0,
  // off this existing read (no new request). Session-deduped via milestoneOnce.
  const milestoneOnce = useMilestoneOnce();
  useEffect(() => {
    if (formatted === undefined) return;
    maybeTrackWalletFunded(Number(formatted), milestoneOnce);
  }, [formatted, milestoneOnce]);

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "px-3 py-2.5",
        "bg-(--brand-row-bg) rounded-(--brand-radius)",
        "transition-colors hover:bg-(--brand-row-hover)",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-(--brand-surface) border border-(--brand-border) flex items-center justify-center">
          <Wallet className="w-4 h-4 text-(--brand-fg)" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
            Available to fund
          </p>
          {address ? (
            <WalletAddress address={address} />
          ) : (
            <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
              Your wallet balance
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm font-medium text-(--brand-fg) tabular-nums">
            {formatted ?? "0"} USDC
          </span>
        )}
        <Tooltip content="Refresh balance">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="p-1.5 rounded-full transition-colors cursor-pointer text-(--brand-muted) hover:text-(--brand-fg) hover:bg-black/5 disabled:opacity-50"
            aria-label="Refresh balance"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
