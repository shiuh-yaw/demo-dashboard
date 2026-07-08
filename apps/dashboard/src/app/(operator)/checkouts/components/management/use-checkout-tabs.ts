/**
 * Custom Hook for Checkout Tab Navigation
 *
 * Handles tab configuration, active tab detection, and navigation state
 * for checkout pages. Separates navigation logic from presentation.
 */

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type TabId = "overview" | "transactions" | "users" | "settings";

export interface TabConfig {
  id: TabId;
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
}

interface UseCheckoutTabsOptions {
  checkoutId: string;
  transactionCount: number;
  userCount: number;
}

interface UseCheckoutTabsReturn {
  tabs: TabConfig[];
  activeTab: TabId;
  isTransactionDetail: boolean;
  basePath: string;
}

/**
 * Determines the active tab based on the current pathname
 */
function getActiveTabFromPathname(pathname: string, basePath: string): TabId {
  // Check if we're on a transaction detail page (path includes /transactions/)
  if (pathname.includes("/transactions/")) return "transactions";
  if (pathname.endsWith("/transactions")) return "transactions";
  if (pathname.endsWith("/users")) return "users";
  if (pathname.endsWith("/settings")) return "settings";
  return "overview";
}

/**
 * Checks if the current pathname represents a transaction detail page
 */
function isTransactionDetailPage(pathname: string, basePath: string): boolean {
  return (
    pathname.includes("/transactions/") &&
    pathname !== `${basePath}/transactions`
  );
}

export function useCheckoutTabs({
  checkoutId,
  transactionCount,
  userCount,
}: UseCheckoutTabsOptions): UseCheckoutTabsReturn {
  const pathname = usePathname();
  const basePath = `/checkouts/${checkoutId}`;

  // Memoize tabs configuration to avoid recreating on every render
  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: "overview",
        label: "Overview",
        href: basePath,
        icon: LayoutDashboard,
      },
      {
        id: "transactions",
        label: "Transactions",
        href: `${basePath}/transactions`,
        icon: ArrowLeftRight,
        count: transactionCount,
      },
      {
        id: "users",
        label: "Users",
        href: `${basePath}/users`,
        icon: Users,
        count: userCount,
      },
      {
        id: "settings",
        label: "Settings",
        href: `${basePath}/settings`,
        icon: Settings,
      },
    ],
    [basePath, transactionCount, userCount]
  );

  // Memoize active tab calculation
  const activeTab = useMemo<TabId>(
    () => getActiveTabFromPathname(pathname, basePath),
    [pathname, basePath]
  );

  // Memoize transaction detail detection
  const isTransactionDetail = useMemo(
    () => isTransactionDetailPage(pathname, basePath),
    [pathname, basePath]
  );

  return {
    tabs,
    activeTab,
    isTransactionDetail,
    basePath,
  };
}
