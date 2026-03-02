/**
 * Earn Page for /e/[id]
 *
 * The main Earn page with custom config applied.
 */

import earnData from "@/data/mock-earn-data.json";
import { WithdrawToBankOption } from "@/components/withdraw-to-bank-option";
import { WithdrawToWalletOption } from "@/components/withdraw-to-wallet-option";
import { WithdrawToExchangeOption } from "@/components/withdraw-to-exchange-option";
import { EarnPageClient } from "@/app/(dashboard)/earn/earn-page-client";
import { RecentActivity } from "@/components/recent-activity";
import { EarnPageHeader } from "@/components/earn-page-header";

// Metadata is inherited from /e/[id]/layout.tsx generateMetadata

export default function EarnPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header - uses config from context */}
      <EarnPageHeader />

      {/* Summary Cards Row — pending payouts from payout demo context (localStorage) */}
      <EarnPageClient
        totalCreatorBalanceConfig={earnData.totalCreatorBalance}
        prepaidCardConfig={{
          cardNumber: earnData.prepaidCard.fullNumber,
          cardExpiration: earnData.prepaidCard.expiry,
          currency: earnData.prepaidCard.currency,
        }}
        withdrawOptions={
          <>
            <WithdrawToBankOption />
            <WithdrawToWalletOption />
            <WithdrawToExchangeOption />
          </>
        }
      />

      {/* Recent Activity Section - uses real-time data from context */}
      <RecentActivity />
    </div>
  );
}
