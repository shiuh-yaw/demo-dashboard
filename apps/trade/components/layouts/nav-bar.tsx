"use client";

/**
 * Nav Bar Component
 *
 * Floating bottom navigation with pill-shaped active tab styling.
 * Hovers above content with shadow and backdrop.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ArrowLeftRight,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const TABS: Tab[] = [
  { id: "portfolio", label: "Portfolio", icon: LayoutGrid, href: "portfolio" },
  { id: "trade", label: "Trade", icon: ArrowLeftRight, href: "trade" },
  { id: "earn", label: "Earn", icon: TrendingUp, href: "earn" },
  { id: "predictions", label: "Predict", icon: Target, href: "predictions" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 rounded-full bg-trade-surface-blue/95 dark:bg-trade-surface/95 backdrop-blur-md border border-trade-border/50 shadow-xl p-1.5">
      {TABS.map((tab) => {
        const href = `/${tab.href}`;
        const isActive = pathname?.includes(`/${tab.href}`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={href}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                isActive
                  ? "bg-trade-accent text-white shadow-sm"
                  : "text-trade-text-secondary hover:text-trade-text-primary"
              }
            `}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
