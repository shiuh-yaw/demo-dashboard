"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { currentUser } from "@/lib/mock-data";
import { TabButton } from "@/components/ui/tab-button";
import { ProceedsByMonthTab } from "./proceeds-by-month-tab";
import { OnChainActivityTab } from "./on-chain-activity-tab";

type Tab = "proceeds" | "onchain";

const TABS = {
  proceeds: {
    label: "Proceeds by month",
    panelId: "reports-panel-proceeds",
    tabId: "reports-tab-proceeds",
  },
  onchain: {
    label: "Onchain activity",
    panelId: "reports-panel-onchain",
    tabId: "reports-tab-onchain",
  },
} as const satisfies Record<Tab, { label: string; panelId: string; tabId: string }>;

function isTab(value: string | null): value is Tab {
  return value === "proceeds" || value === "onchain";
}

export function ReportsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Source of truth lives in the URL so deep links like `/reports?tab=onchain`
  // land the user straight on the right tab and browser back/forward works.
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "proceeds";

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "proceeds") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-[13px] text-(--brand-muted) mb-4">
        <span>Home</span>
        <span className="mx-1.5 opacity-40">/</span>
        <span className="text-(--brand-fg)">Payments and Financial Reports</span>
      </nav>

      {/* Page heading with legal entity + vendor chip */}
      <div className="flex items-start justify-between gap-6 mb-1">
        <h1 className="heading-page">Payments and Financial Reports</h1>
      </div>
      <div className="flex items-center gap-2 mb-7">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--brand-fg) bg-(--brand-surface) border border-(--brand-input-border) rounded-lg px-3 py-1.5 hover:bg-(--brand-row-bg) transition-colors"
        >
          {currentUser.company}
          <span className="text-(--brand-muted)">·</span>
          <span className="tabular-nums text-(--brand-muted)">
            Vendor {currentUser.vendorId}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-(--brand-muted)" />
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Payments and Financial Reports sections"
        className="flex items-center gap-6 border-b border-(--brand-border) mb-6"
      >
        {(Object.keys(TABS) as Tab[]).map((key) => (
          <TabButton
            key={key}
            id={TABS[key].tabId}
            controls={TABS[key].panelId}
            active={tab === key}
            onClick={() => setTab(key)}
          >
            {TABS[key].label}
          </TabButton>
        ))}
      </div>

      <div
        role="tabpanel"
        id={TABS[tab].panelId}
        aria-labelledby={TABS[tab].tabId}
      >
        {tab === "proceeds" ? <ProceedsByMonthTab /> : <OnChainActivityTab />}
      </div>
    </div>
  );
}
