"use client";

/**
 * Right-rail panel on every scenario page. Four sibling tabs:
 *
 *   - SDK      : the 6-step integration in TypeScript form
 *   - API      : the same 6 steps as `curl` snippets
 *   - Webhooks : verified-handler reference + per-axis event payloads
 *   - Helpers  : standalone Dynamic SDK calls (auth, picker, balances)
 *
 * A "Scaffold with AI" chip can sit on the right of the tab row to
 * open a paste-into-your-AI-assistant prompt; toggled via the
 * `SHOW_AI_CHIP` constant below.
 *
 * Supports deep-linking via URL hash:
 *   - `#helpers` → opens the Helpers tab
 *   - `#exchange` → opens the Helpers tab and scrolls to Exchange
 *   - `#sdk`, `#api`, `#webhooks` → opens respective tabs
 *
 * This file is the orchestrator only — the pane bodies, atoms, and
 * notices live in sibling files (`code-panel-{atoms,notices,stepper,
 * helpers-pane,webhooks-pane,ai-dialog}.tsx`). External call sites
 * keep importing `@/components/code-panel` for both the component and
 * its types (re-exported from `./code-panel-types`).
 */

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@dynamic-labs-sdk/droplet";
import { useCallback, useEffect, useState } from "react";
import { AiChipButton, AiPromptDialog } from "./code-panel-ai-dialog";
import { HelpersPane } from "./code-panel-helpers-pane";
import {
  HelpersIntroNotice,
  MainnetOnlyNotice,
  WebhooksIntroNotice,
} from "./code-panel-notices";
import { Stepper } from "./code-panel-stepper";
import type { CodePanelProps } from "./code-panel-types";
import { WebhooksPane } from "./code-panel-webhooks-pane";

/** Map URL hash fragments to tab values. */
const HASH_TO_TAB: Record<string, string> = {
  sdk: "sdk",
  api: "api",
  webhooks: "webhooks",
  helpers: "helpers",
  exchange: "helpers",
};

function getInitialTab(): string {
  if (typeof window === "undefined") return "sdk";
  const hash = window.location.hash.replace("#", "").toLowerCase();
  return HASH_TO_TAB[hash] ?? "sdk";
}

/** Update the URL hash without a full navigation. */
function setHash(hash: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${hash}`);
}

// Re-export the public types so call sites continue to import the
// whole code-panel surface from one path.
export type {
  AiPromptContent,
  CodePanelProps,
  CodeStep,
  HelperCard,
  WebhookEventCard,
  WebhookHandlerCard,
} from "./code-panel-types";

const TAB_TRIGGER_CLS = cn(
  "rounded-full px-3.5 py-1.5 text-xs font-medium",
  "data-[state=active]:bg-(--brand-surface)",
  "data-[state=active]:text-(--brand-fg)",
  "data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  "text-(--brand-muted)",
);

// `ai` is still threaded through so the prompt data + dialog component
// stay wired and ready to surface again — the chip + dialog are
// intentionally not rendered for now. Flip `SHOW_AI_CHIP` to `true` to
// bring them back without touching the call sites.
const SHOW_AI_CHIP = false;

export function CodePanel({
  sdkSteps,
  apiSteps,
  helpers,
  ai,
  webhookHandler,
  webhookEvents,
  webhookDocsUrl,
}: CodePanelProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setHash(tab);
  }, []);

  // Scroll to hash target after the helpers tab renders.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (!hash) return;
    // Small delay so the tab content has rendered before scrolling.
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-5"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList
            className={cn(
              "bg-(--brand-row-bg) border border-(--brand-border) rounded-full p-1 h-auto",
            )}
          >
            <TabsTrigger value="sdk" className={TAB_TRIGGER_CLS}>
              SDK
            </TabsTrigger>
            <TabsTrigger value="api" className={TAB_TRIGGER_CLS}>
              API
            </TabsTrigger>
            <TabsTrigger value="webhooks" className={TAB_TRIGGER_CLS}>
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="helpers" className={TAB_TRIGGER_CLS}>
              Helpers
            </TabsTrigger>
          </TabsList>

          {SHOW_AI_CHIP ? (
            <AiChipButton onClick={() => setAiOpen(true)} />
          ) : null}
        </div>

        <TabsContent value="sdk" className="mt-0 flex flex-col gap-5">
          <MainnetOnlyNotice />
          <Stepper steps={sdkSteps} />
        </TabsContent>
        <TabsContent value="api" className="mt-0 flex flex-col gap-5">
          <MainnetOnlyNotice />
          <Stepper steps={apiSteps} />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-0 flex flex-col gap-5">
          <WebhooksIntroNotice />
          <WebhooksPane
            handler={webhookHandler}
            events={webhookEvents}
            docsUrl={webhookDocsUrl}
          />
        </TabsContent>
        <TabsContent value="helpers" className="mt-0 flex flex-col gap-5">
          <HelpersIntroNotice />
          <HelpersPane helpers={helpers} />
        </TabsContent>
      </Tabs>

      {SHOW_AI_CHIP ? (
        <AiPromptDialog ai={ai} open={aiOpen} onOpenChange={setAiOpen} />
      ) : null}
    </>
  );
}
