"use client";

/**
 * Deposit `/card` screen - a `WidgetCard` back-arrow sub-screen (`onBack`
 * renders the `<` arrow built into `packages/ui/src/widget-card.tsx`).
 * Shows the "Available to fund" row then the deposit form (`DepositForm`,
 * from `fund-card.tsx`); a successful deposit returns to the main screen.
 */

import { WidgetCard } from "@dynamic-demos/ui";

import type { CardNavigationReturn } from "@/hooks/use-card-navigation";
import { AvailableToFundRow } from "@/components/dynamic-card/wallet-balance-display";
import { DepositForm } from "@/components/dynamic-card/fund-card";

export interface DepositScreenProps {
  navigation: CardNavigationReturn;
}

export function DepositScreen({ navigation }: DepositScreenProps) {
  return (
    <WidgetCard
      title="Deposit"
      subtitle="Add funds to your card"
      onBack={navigation.goToMain}
    >
      <div className="space-y-4">
        <AvailableToFundRow />
        <DepositForm onSuccess={navigation.goToMain} />
      </div>
    </WidgetCard>
  );
}
