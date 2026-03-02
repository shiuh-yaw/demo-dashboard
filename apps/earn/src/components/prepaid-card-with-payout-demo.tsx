"use client";

import { PrepaidCardWithButton } from "@/components/prepaid-card-with-button";
import { usePayoutDemo } from "@/contexts/payout-demo-context";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";

interface PrepaidCardWithPayoutDemoProps {
  cardNumber: string;
  cardExpiration: string;
  currency: string;
  onAddFundsSuccess?: () => void;
}

/**
 * Prepaid card demo: balance from context (localStorage), Add Funds modal
 * adds to card balance. Add funds uses the same max amount as the Total
 * creator balance card (real PYUSD). Reset payout demo also resets this
 * card to a random 333–3333.
 */
export function PrepaidCardWithPayoutDemo({
  cardNumber,
  cardExpiration,
  currency,
  onAddFundsSuccess,
}: PrepaidCardWithPayoutDemoProps) {
  const { state, isHydrated, prepaidBalance, addFunds, recordAddFundsActivity } = usePayoutDemo();
  const creatorBalance = useCreatorBalanceOptional();

  const balance = isHydrated ? String(prepaidBalance) : "0";
  const maxAddAmount =
    creatorBalance?.balance ?? (isHydrated ? String(state.availableToRequest) : "0");

  const handleAddFundsSuccess = (amount: number) => {
    // Optimistically deduct from creator balance so UI updates immediately
    creatorBalance?.deductBalance(amount);
    addFunds(amount);
    recordAddFundsActivity(amount);
    onAddFundsSuccess?.();
  };

  return (
    <PrepaidCardWithButton
      cardNumber={cardNumber}
      cardExpiration={cardExpiration}
      balance={balance}
      currency={currency}
      maxAddAmount={maxAddAmount}
      onAddFundsSuccess={handleAddFundsSuccess}
    />
  );
}
