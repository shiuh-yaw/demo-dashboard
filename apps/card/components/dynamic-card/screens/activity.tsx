"use client";

/**
 * Activity `/card` screen - a `WidgetCard` back-arrow sub-screen showing the
 * full Rain transaction history as wallet-style rows
 * (`components/dynamic-card/card-transactions.tsx`). The header carries the
 * embedded-wallet address (copy + explorer) so the funding wallet is one tap
 * from its on-chain view.
 */

import { WidgetCard } from "@dynamic-demos/ui";

import type { CardNavigationReturn } from "@/hooks/use-card-navigation";
import { TransactionsList } from "@/components/dynamic-card/card-transactions";
import { useEvmWalletAccount } from "@/hooks/use-evm-wallet-account";
import { WalletAddress } from "@/components/dynamic-card/wallet-address";

export interface ActivityScreenProps {
  navigation: CardNavigationReturn;
}

export function ActivityScreen({ navigation }: ActivityScreenProps) {
  const address = useEvmWalletAccount()?.address;
  return (
    <WidgetCard
      title="Activity"
      subtitle={address ? <WalletAddress address={address} /> : undefined}
      onBack={navigation.goToMain}
    >
      {/* Cap the history height and scroll internally: long lists don't blow
          out the card, short lists don't leave dead space. */}
      <div className="max-h-[440px] overflow-y-auto">
        <TransactionsList enabled />
      </div>
    </WidgetCard>
  );
}
