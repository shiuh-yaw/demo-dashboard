"use client";

/**
 * Tab Bar Component
 *
 * Left sidebar navigation optimized for 1920x1080 stage presentation.
 * Large tab items with neon green accent on active state.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  { id: "portfolio", label: "Portfolio", icon: LayoutDashboard, href: "portfolio" },
  { id: "trade", label: "Trade", icon: ArrowLeftRight, href: "trade" },
  { id: "earn", label: "Earn", icon: TrendingUp, href: "earn" },
  { id: "predictions", label: "Predict", icon: Target, href: "predictions" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col w-64 shrink-0 h-full border-r"
      style={{
        backgroundColor: "var(--trade-surface)",
        borderColor: "var(--trade-border)",
      }}
    >
      <div className="flex flex-col gap-1 px-3 py-6">
        {TABS.map((tab) => {
          const href = `/${tab.href}`;
          const isActive = pathname?.includes(`/${tab.href}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={href}
              className={`
                group flex items-center gap-4 px-4 rounded-lg transition-all duration-200
                ${isActive ? "text-glow" : ""}
              `}
              style={{
                minHeight: 56,
                color: isActive
                  ? "var(--trade-accent)"
                  : "var(--trade-text-secondary)",
                backgroundColor: isActive
                  ? "rgba(0, 255, 136, 0.06)"
                  : "transparent",
                borderLeft: isActive
                  ? "3px solid var(--trade-accent)"
                  : "3px solid transparent",
              }}
            >
              <Icon
                size={24}
                className={`transition-colors duration-200 ${
                  !isActive
                    ? "group-hover:brightness-150"
                    : ""
                }`}
              />
              <span
                className={`text-lg font-medium transition-colors duration-200 ${
                  !isActive
                    ? "group-hover:brightness-150"
                    : ""
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
