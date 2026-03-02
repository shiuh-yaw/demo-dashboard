"use client";

import { useState } from "react";
import { CreditCard } from "@/components/credit-cards";
import { AddFundsModal } from "@/components/add-funds-modal";

interface PrepaidCardWithButtonProps {
  cardNumber: string;
  cardExpiration: string;
  balance: string;
  currency: string;
  /** Max amount user can add (from their balance). Used by Add Funds modal. */
  maxAddAmount: string;
  onAddFundsSuccess: (amount: number) => void;
}

export function PrepaidCardWithButton({
  cardNumber,
  cardExpiration,
  balance,
  currency,
  maxAddAmount,
  onAddFundsSuccess,
}: PrepaidCardWithButtonProps) {
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  return (
    <div className="w-full sm:max-w-sm lg:max-w-md mx-auto">
      <CreditCard
        cardNumber={cardNumber}
        fullCardNumber="4532 1234 5678 1337"
        cardExpiration={cardExpiration}
        type="gray-light"
        cardType="mastercard"
        company="Prepaid card"
        balance={balance}
        currency={currency}
        showAddFundsButton={true}
        onAddFunds={() => setIsAddFundsOpen(true)}
        showLogo={true}
      />
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        maxAmount={maxAddAmount}
        onSuccess={onAddFundsSuccess}
      />
    </div>
  );
}
