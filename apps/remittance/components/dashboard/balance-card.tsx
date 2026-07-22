"use client";

import { useState, useEffect } from "react";
import { Spinner, Button } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { RefreshCw } from "lucide-react";
import { refreshAuth } from "@/lib/dynamic";

const WALLET_SETUP_TIMEOUT_MS = 20_000;

interface BalanceCardProps {
  /** Wallet balance (available to send) */
  walletBalance: number;
  /** Save/earn balance */
  saveBalance: number;
  /** Card balance (spendable on debit card) */
  cardBalance: number;
  balanceLoading: boolean;
  cardBalanceLoading?: boolean;
  walletAddress: string;
}

export function BalanceCard({
  walletBalance,
  saveBalance,
  cardBalance,
  balanceLoading,
  cardBalanceLoading = false,
  walletAddress,
}: BalanceCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshFallback, setShowRefreshFallback] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      setShowRefreshFallback(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowRefreshFallback(true);
    }, WALLET_SETUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [walletAddress]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuth();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isWalletPending = !walletAddress;
  const isLoading = balanceLoading || cardBalanceLoading;
  const total = walletBalance + saveBalance + cardBalance;

  const breakdownParts: string[] = [];
  breakdownParts.push(
    `${formatCurrency(walletBalance, { symbol: true })} available`,
  );
  if (saveBalance > 0) {
    breakdownParts.push(
      `${formatCurrency(saveBalance, { symbol: true })} earning`,
    );
  }
  if (cardBalance > 0) {
    breakdownParts.push(
      `${formatCurrency(cardBalance, { symbol: true })} on card`,
    );
  }
  const breakdown = breakdownParts.join(" · ");

  return (
    // Solid primary underlay: stored brand themes may supply translucent
    // gradient washes, so the gradient layers OVER the primary and the
    // derived readable foreground keeps the text visible on any brand.
    <div className="relative overflow-hidden rounded-2xl bg-(--brand-primary) bg-linear-to-br from-(--brand-card-gradient-start) to-(--brand-card-gradient-end) p-6 text-(--brand-primary-fg) shadow-lg shadow-black/10">
      {/* Subtle circle overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        aria-hidden
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white" />
      </div>

      <div className="relative">
        <p className="text-sm text-(--brand-primary-fg)/70 tracking-wider mb-1">
          Total balance
        </p>
        {isLoading || isWalletPending ? (
          <div className="py-2">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold tracking-tight">
              {formatCurrency(total, { symbol: true })}
            </p>
            <p className="text-sm text-(--brand-primary-fg)/70 mt-2">{breakdown}</p>
          </>
        )}
        {isWalletPending && (
          <div className="mt-4 flex flex-col gap-2">
            {showRefreshFallback ? (
              <>
                <p className="text-sm text-(--brand-primary-fg)/60 mt-1">
                  Refresh to see if a wallet was created for you.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing}
                  className="self-start border-(--brand-primary-fg)/40 text-(--brand-primary-fg) hover:bg-(--brand-primary-fg)/10 hover:border-(--brand-primary-fg)/60"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </>
            ) : (
              <p className="text-sm text-(--brand-primary-fg)/60 mt-1">
                Setting up your wallet…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
