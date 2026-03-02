"use client";

/**
 * Checkout Tabs Component
 *
 * Renders the tab navigation for checkout pages.
 * Handles tab styling, active states, and badges.
 */

import Link from "next/link";
import type { TabConfig, TabId } from "./use-checkout-tabs";

interface CheckoutTabsProps {
  tabs: TabConfig[];
  activeTab: TabId;
}

export function CheckoutTabs({ tabs, activeTab }: CheckoutTabsProps) {
  return (
    <div className="border-b border-slate-200 mb-8">
      <nav className="-mb-px flex gap-8">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                group inline-flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "border-[#4779FF] text-[#4779FF]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }
              `}
            >
              <tab.icon
                className={`w-4 h-4 ${
                  isActive
                    ? "text-[#4779FF]"
                    : "text-slate-400 group-hover:text-slate-500"
                }`}
              />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
