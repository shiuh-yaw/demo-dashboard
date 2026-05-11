"use client";

import { Plus, CreditCard } from "lucide-react";
import { Card, CardContent, Button, StableCoinCard } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";

interface StableCoinDebitCardProps {
  /** Card data from user metadata. When null, show "Create card" CTA. */
  stubCard: { cardNumber: string; expiry?: string } | null;
  /** USDC balance to display on card (optional). */
  balance?: number;
  /** When true, show loading skeleton on balance. */
  balanceLoading?: boolean;
  /** Whether card creation is in progress. */
  isCreating?: boolean;
  /** Called when user clicks "Create card". */
  onCreateCard?: () => void;
  /** Show Add funds button on the card (like earn app). */
  showAddFundsButton?: boolean;
  /** Called when user clicks Add funds. */
  onAddFunds?: () => void;
}

export function StableCoinDebitCard({
  stubCard,
  balance = 0,
  balanceLoading = false,
  isCreating = false,
  onCreateCard,
  showAddFundsButton = false,
  onAddFunds,
}: StableCoinDebitCardProps) {
  const { branding } = useRemittanceConfig();
  if (!stubCard) {
    return (
      <Card>
        <CardContent className="flex flex-col py-6">
          <h3 className="text-base font-medium text-(--brand-fg) mb-2">
            Bank cards
          </h3>
          <p className="text-sm text-(--brand-muted) mb-6">
            Create a stablecoin debit card to spend your USDC
          </p>
          <div className="flex flex-col items-center">
            <div className="w-16 h-12 rounded-lg border-2 border-(--brand-border) border-dashed flex items-center justify-center mb-6 bg-(--brand-row-bg)/50">
              <CreditCard className="w-8 h-8 text-(--brand-muted)" />
            </div>
            <Button
              size="sm"
              onClick={onCreateCard}
              disabled={isCreating}
              loading={isCreating}
              className="bg-(--brand-primary) hover:bg-(--brand-primary-hover) text-white"
            >
              <Plus className="w-4 h-4" />
              Add new card
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <StableCoinCard
      company="Stablecoin Card"
      cardNumber={stubCard.cardNumber}
      fullCardNumber={stubCard.cardNumber}
      cardExpiration={stubCard.expiry}
      balance={balance}
      balanceLoading={balanceLoading}
      cardType="visa"
      variant="neutral"
      showAddFundsButton={showAddFundsButton}
      onAddFunds={onAddFunds}
      logo={
        <div className="shrink-0 overflow-visible">
          <AppLogo
            className="h-5 text-slate-800"
            logoUrl={branding.logoUrl}
          />
        </div>
      }
    />
  );
}
