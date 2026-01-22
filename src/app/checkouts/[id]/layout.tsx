/**
 * Checkout Layout (Server Component)
 *
 * Shared layout for all checkout tabs. Provides the header and tab navigation.
 * Each tab page fetches its own data server-side.
 */

import { notFound } from "next/navigation";
import { getCheckoutConfig } from "@/lib/actions/checkouts";
import { transactionService, userService } from "@/lib/services";
import { CheckoutLayoutClient } from "../components/management/checkout-layout-client";
import { CheckoutSaveProvider } from "../components/management/checkout-save-context";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function CheckoutLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;

  // Fetch checkout config
  const checkout = await getCheckoutConfig(id);
  if (!checkout) notFound();

  // Fetch counts for tab badges (lightweight)
  const [transactionsResult, usersResult] = await Promise.all([
    transactionService.list(id, { pageSize: 1 }).catch(() => ({ total: 0 })),
    userService.list(id, { pageSize: 1 }).catch(() => ({ total: 0 })),
  ]);

  return (
    <CheckoutSaveProvider>
      <CheckoutLayoutClient
        checkout={checkout}
        transactionCount={transactionsResult.total}
        userCount={usersResult.total}
      >
        {children}
      </CheckoutLayoutClient>
    </CheckoutSaveProvider>
  );
}
