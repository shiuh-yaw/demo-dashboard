"use client";

/**
 * Checkout Layout Client Component
 *
 * Provides the header and tab navigation for checkout pages.
 * Uses Link-based navigation for proper server-side routing.
 */

import type { StoredCheckoutConfig } from "@/lib/types/dashboard";
import { CheckoutHeader } from "./checkout-header";
import { CheckoutTabs } from "./checkout-tabs";
import { useCheckoutTabs } from "./use-checkout-tabs";

interface CheckoutLayoutClientProps {
  checkout: StoredCheckoutConfig;
  transactionCount: number;
  userCount: number;
  children: React.ReactNode;
}

export function CheckoutLayoutClient({
  checkout,
  transactionCount,
  userCount,
  children,
}: CheckoutLayoutClientProps) {
  const { tabs, activeTab, isTransactionDetail, basePath } = useCheckoutTabs({
    checkoutId: checkout.id,
    transactionCount,
    userCount,
  });

  return (
    <div>
      {/* Header */}
      <CheckoutHeader
        checkout={checkout}
        basePath={basePath}
        activeTab={activeTab}
        isTransactionDetail={isTransactionDetail}
      />

      {/* Tabs - Primary Navigation */}
      <CheckoutTabs tabs={tabs} activeTab={activeTab} />

      {/* Tab Content */}
      {children}
    </div>
  );
}
