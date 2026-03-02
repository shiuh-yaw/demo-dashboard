"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@dynamic-demos/ui";
import { Skeleton } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { TotalCreatorBalance } from "@/components/total-creator-balance";
import { GetPaidButton } from "@/components/get-paid-button";
import { usePayoutDemo } from "@/contexts/payout-demo-context";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";
import { cn } from "@dynamic-demos/utils";

interface EarnSummaryCardsProps {
  totalCreatorBalance: {
    apy: string;
    paymentFrequency: string;
  };
  balanceRefreshKey?: number;
  onBalanceChange?: () => void;
}

export function EarnSummaryCards({
  totalCreatorBalance,
  balanceRefreshKey: externalRefreshKey,
  onBalanceChange,
}: EarnSummaryCardsProps) {
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const {
    state: payoutState,
    highlightUpcoming,
    isHydrated,
    recordPayoutRequest,
  } = usePayoutDemo();
  const creatorBalance = useCreatorBalanceOptional();

  const handleMintSuccess = (requestedAmount: number) => {
    // Optimistically add to creator balance so UI updates immediately
    creatorBalance?.addToBalance(requestedAmount);
    setLocalRefreshKey((k) => k + 1);
    recordPayoutRequest(requestedAmount);
    onBalanceChange?.();
  };

  // Use external key if provided, otherwise use local
  const effectiveRefreshKey = externalRefreshKey ?? localRefreshKey;

  // Only show real values after we've loaded from localStorage (or created and stored) to avoid hydration mismatch and visible changes
  const availableStr = isHydrated
    ? String(payoutState.availableToRequest)
    : "0";
  const upcomingStr = isHydrated ? String(payoutState.upcoming) : "0";
  const fundsOnHoldStr = isHydrated ? String(payoutState.fundsOnHold) : "0";
  const showPlaceholder = !isHydrated;
  const hasAvailable =
    !isHydrated || (isHydrated && payoutState.availableToRequest > 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
      <Card>
        <CardContent>
          <CardTitle className="mb-3">Total balance</CardTitle>
          <TotalCreatorBalance
            refreshTrigger={effectiveRefreshKey}
            pollInterval={5000}
          />
          <p className="text-xs text-earn-text-secondary mb-1">
            Earning {Math.floor(Number(totalCreatorBalance.apy))}% APY
            automatically
          </p>
          <p className="text-xs text-earn-text-secondary">
            Paid {totalCreatorBalance.paymentFrequency} • Funds liquid
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardHeader className="mb-4">
            <CardTitle>Pending payouts</CardTitle>
            {hasAvailable && (
              <GetPaidButton
                availableAmount={availableStr}
                apy={totalCreatorBalance.apy}
                showHelperText={false}
                size="default"
                directMint
                onMintSuccess={(amount) => handleMintSuccess(amount)}
              />
            )}
          </CardHeader>

          {hasAvailable ? (
            <>
              <p className="text-xs text-earn-text-secondary mb-1.5">
                Available to request
              </p>
              <div className="text-2xl font-medium tabular-nums text-earn-text-primary mb-3">
                {showPlaceholder ? (
                  <Skeleton className="h-8 w-24" aria-hidden />
                ) : (
                  formatCurrency(availableStr)
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-earn-text-secondary mb-1.5">
                Upcoming
              </p>
              <div className="text-2xl font-medium tabular-nums text-earn-text-primary mb-3">
                {showPlaceholder ? (
                  <Skeleton className="h-8 w-24" aria-hidden />
                ) : (
                  formatCurrency(upcomingStr)
                )}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 py-1">
            {hasAvailable && (
              <span
                className={cn(
                  "text-xs min-w-0",
                  highlightUpcoming
                    ? "text-earn-text-primary font-medium"
                    : "text-earn-text-secondary",
                )}
              >
                Upcoming ·{" "}
                {showPlaceholder ? (
                  <Skeleton
                    inline
                    className="inline-block h-3.5 w-12 align-middle"
                    aria-hidden
                  />
                ) : (
                  <span className="tabular-nums font-medium text-earn-text-primary">
                    {formatCurrency(upcomingStr)}
                  </span>
                )}
              </span>
            )}
            <span className="text-xs text-earn-text-secondary min-w-0">
              Funds on hold ·{" "}
              {showPlaceholder ? (
                <Skeleton
                  inline
                  className="inline-block h-3.5 w-12 align-middle"
                  aria-hidden
                />
              ) : (
                <span className="tabular-nums font-medium text-earn-text-primary">
                  {formatCurrency(fundsOnHoldStr)}
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
