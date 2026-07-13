"use client";

/**
 * Right-rail integration panel — generalized from
 * apps/flow/components/code-panel.tsx. Tabs render only for the panes
 * provided (SDK always; API and Webhooks when passed). Droplet's Tabs
 * is replaced by a hand-rolled pill tab row with the same styling.
 * URL-hash deep links (#sdk, #api, #webhooks) are preserved.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { Stepper } from "./code-panel-stepper";
import type { CodePanelProps } from "./code-panel-types";

export type { CodeStep, CodePanelProps } from "./code-panel-types";

type TabId = "sdk" | "api" | "webhooks";

function setHash(hash: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${hash}`);
}

export function CodePanel({
  sdkSteps,
  apiSteps,
  webhooksPane,
  notice,
}: CodePanelProps) {
  const tabs = useMemo<Array<{ id: TabId; label: string }>>(
    () => [
      { id: "sdk" as const, label: "SDK" },
      ...(apiSteps?.length ? [{ id: "api" as const, label: "API" }] : []),
      ...(webhooksPane
        ? [{ id: "webhooks" as const, label: "Webhooks" }]
        : []),
    ],
    [apiSteps, webhooksPane],
  );
  const [activeTab, setActiveTab] = useState<TabId>("sdk");

  // Hash deep-links are read after mount so server and client agree on
  // the initial tab ("sdk") during hydration.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (tabs.some((t) => t.id === hash)) setActiveTab(hash as TabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only read
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setHash(tab);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {tabs.length > 1 ? (
        <div
          role="tablist"
          className="self-start inline-flex bg-(--brand-row-bg) border border-(--brand-border) rounded-full p-1"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-(--brand-surface) text-(--brand-fg) shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "text-(--brand-muted)",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {notice}

      {activeTab === "sdk" ? <Stepper steps={sdkSteps} /> : null}
      {activeTab === "api" && apiSteps ? <Stepper steps={apiSteps} /> : null}
      {activeTab === "webhooks" && webhooksPane ? webhooksPane : null}
    </div>
  );
}
