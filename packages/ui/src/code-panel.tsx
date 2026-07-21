"use client";

/**
 * Right-rail integration panel — generalized from
 * apps/flow/components/code-panel.tsx. Tabs render only for the panes
 * provided (SDK always; API, Webhooks, and Helpers when passed).
 * Droplet's Tabs is replaced by a hand-rolled pill tab row with the
 * same styling. URL-hash deep links (#sdk, #api, #webhooks, #helpers,
 * plus `hashAliases` like flow's #exchange) are preserved; after a
 * hash-selected tab renders, the panel scrolls to the element whose id
 * matches the raw hash.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@dynamic-demos/utils";
import { Stepper } from "./code-panel-stepper";
import type { CodePanelProps, CodePanelTabId } from "./code-panel-types";

export type {
  CodeStep,
  CodePanelProps,
  CodePanelTabId,
} from "./code-panel-types";

function setHash(hash: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${hash}`);
}

export function CodePanel({
  sdkSteps,
  apiSteps,
  webhooksPane,
  helpersPane,
  notice,
  stepsNotice,
  hashAliases,
}: CodePanelProps) {
  const tabs = useMemo<Array<{ id: CodePanelTabId; label: string }>>(
    () => [
      { id: "sdk" as const, label: "SDK" },
      ...(apiSteps?.length ? [{ id: "api" as const, label: "API" }] : []),
      ...(webhooksPane
        ? [{ id: "webhooks" as const, label: "Webhooks" }]
        : []),
      ...(helpersPane ? [{ id: "helpers" as const, label: "Helpers" }] : []),
    ],
    [apiSteps, webhooksPane, helpersPane],
  );
  const [activeTab, setActiveTab] = useState<CodePanelTabId>("sdk");

  // Hash deep-links are read after mount so server and client agree on
  // the initial tab ("sdk") during hydration.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    const target = hashAliases?.[hash] ?? hash;
    if (tabs.some((t) => t.id === target))
      setActiveTab(target as CodePanelTabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only read
  }, []);

  const handleTabChange = useCallback((tab: CodePanelTabId) => {
    setActiveTab(tab);
    setHash(tab);
  }, []);

  // Scroll to the hash-addressed element once its tab has rendered
  // (e.g. flow's #exchange lands on the exchange helper card).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (!hash) return;
    const timer = setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

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

      {activeTab === "sdk" ? (
        <>
          {stepsNotice}
          <Stepper steps={sdkSteps} />
        </>
      ) : null}
      {activeTab === "api" && apiSteps ? (
        <>
          {stepsNotice}
          <Stepper steps={apiSteps} />
        </>
      ) : null}
      {activeTab === "webhooks" && webhooksPane ? webhooksPane : null}
      {activeTab === "helpers" && helpersPane ? helpersPane : null}
    </div>
  );
}
