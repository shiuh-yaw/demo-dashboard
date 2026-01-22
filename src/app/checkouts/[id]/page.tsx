/**
 * Checkout Overview Page (Server Component)
 *
 * Shows overview stats and recent activity for an existing checkout.
 */

import { checkoutService, transactionService } from "@/lib/services";
import { OverviewTab } from "../components/management/overview-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckoutOverviewPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch overview data server-side
  const [stats, transactionsResult] = await Promise.all([
    checkoutService.getStats(id).catch(() => null),
    transactionService.list(id, { pageSize: 5 }).catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  return (
    <OverviewTab stats={stats} recentTransactions={transactionsResult.items} />
  );
}
