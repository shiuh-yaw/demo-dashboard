"use client";

import { useState, type ReactNode } from "react";
import { PrepaidCardWithPayoutDemo } from "@/components/prepaid-card-with-payout-demo";
import { EarnSummaryCards } from "@/components/earn-summary-cards";

interface EarnPageClientProps {
  totalCreatorBalanceConfig: {
    apy: string;
    paymentFrequency: string;
  };
  prepaidCardConfig: {
    cardNumber: string;
    cardExpiration: string;
    currency: string;
  };
  withdrawOptions: ReactNode;
}

/**
 * Client wrapper for earn page that manages balance refresh trigger.
 * When Add funds or Get paid succeeds, refreshes the Total balance.
 */
export function EarnPageClient({
  totalCreatorBalanceConfig,
  prepaidCardConfig,
  withdrawOptions,
}: EarnPageClientProps) {
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  const handleBalanceChange = () => {
    setBalanceRefreshKey((k) => k + 1);
  };

  return (
    <>
      {/* Summary Cards Row */}
      <EarnSummaryCards
        totalCreatorBalance={totalCreatorBalanceConfig}
        balanceRefreshKey={balanceRefreshKey}
        onBalanceChange={handleBalanceChange}
      />

      {/* Section Header */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-sm font-medium text-earn-text-secondary">
          Move your money
        </h2>
      </div>

      {/* Money Actions & Prepaid Card Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-8 items-stretch">
        {/* Left Column: Money Decision Actions */}
        <div className="flex flex-col gap-3 sm:gap-4 order-2 sm:order-1">{withdrawOptions}</div>

        {/* Right Column: Prepaid Card */}
        <div className="bg-white border border-earn-border rounded-lg p-3 sm:p-6 flex flex-col justify-center order-1 sm:order-2 min-h-[240px] sm:min-h-[280px]">
          <PrepaidCardWithPayoutDemo
            cardNumber={prepaidCardConfig.cardNumber}
            cardExpiration={prepaidCardConfig.cardExpiration}
            currency={prepaidCardConfig.currency}
            onAddFundsSuccess={handleBalanceChange}
          />
        </div>
      </div>
    </>
  );
}
