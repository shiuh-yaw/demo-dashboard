"use client";

import { useState } from "react";
import { StableCoinCard } from "@dynamic-demos/ui";
import { AddFundsModal } from "@/components/add-funds-modal";
import { AppLogo } from "@/components/icons";
import { useEarnConfig } from "@/contexts/earn-config-context";

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
  const { branding } = useEarnConfig();

  return (
    <div className="w-full sm:max-w-sm lg:max-w-md mx-auto">
      <StableCoinCard
        cardNumber={cardNumber}
        fullCardNumber="4532 1234 5678 1337"
        cardExpiration={cardExpiration}
        variant="gray-light"
        cardType="mastercard"
        company="Prepaid card"
        balance={balance}
        currency={currency}
        showAddFundsButton={true}
        onAddFunds={() => setIsAddFundsOpen(true)}
        logo={
          <div
            className={
              branding.logo === "youtube" ? "-ml-3.5 shrink-0" : "shrink-0"
            }
          >
            <AppLogo
              className="h-3.5"
              brand={branding.logo}
              logoUrl={branding.logoUrl}
            />
          </div>
        }
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
