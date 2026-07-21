/**
 * Right-rail panel on every scenario page — a thin adapter over the
 * shared @dynamic-demos/ui CodePanel (which was generalized from this
 * app). Flow supplies all four tabs: SDK/API steps, the Webhooks pane,
 * and the Helpers pane, plus the mainnet-only notice on the step tabs
 * and the `#exchange` hash alias (opens Helpers and scrolls to the
 * exchange card).
 *
 * The pane bodies live in sibling files (`code-panel-{notices,
 * helpers-pane,webhooks-pane}.tsx`). External call sites keep
 * importing `@/components/code-panel` for both the component and its
 * types (re-exported from `./code-panel-types`).
 */

import { CodePanel as SharedCodePanel } from "@dynamic-demos/ui";
import { HelpersPane } from "./code-panel-helpers-pane";
import {
  HelpersIntroNotice,
  MainnetOnlyNotice,
  WebhooksIntroNotice,
} from "./code-panel-notices";
import type { CodePanelProps } from "./code-panel-types";
import { WebhooksPane } from "./code-panel-webhooks-pane";

// Re-export the public types so call sites continue to import the
// whole code-panel surface from one path.
export type {
  CodePanelProps,
  CodeStep,
  HelperCard,
  WebhookEventCard,
  WebhookHandlerCard,
} from "./code-panel-types";

export function CodePanel({
  sdkSteps,
  apiSteps,
  helpers,
  webhookHandler,
  webhookEvents,
  webhookDocsUrl,
}: CodePanelProps) {
  return (
    <SharedCodePanel
      sdkSteps={sdkSteps}
      apiSteps={apiSteps}
      stepsNotice={<MainnetOnlyNotice />}
      webhooksPane={
        <>
          <WebhooksIntroNotice />
          <WebhooksPane
            handler={webhookHandler}
            events={webhookEvents}
            docsUrl={webhookDocsUrl}
          />
        </>
      }
      helpersPane={
        <>
          <HelpersIntroNotice />
          <HelpersPane helpers={helpers} />
        </>
      }
      hashAliases={{ exchange: "helpers" }}
    />
  );
}
