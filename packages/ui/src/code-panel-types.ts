/**
 * Public types for <CodePanel /> and its panes. Generalized from
 * apps/flow/components/code-panel-types.ts: the step contract is
 * lifted; app-specific card shapes (flow's helpers/webhooks/AI) stay
 * app-local and arrive as pre-composed ReactNode panes. Code is
 * carried as pre-highlighted HTML (`html`) plus the raw string
 * (`rawCode`) for the copy button — this package takes no Shiki
 * dependency; apps highlight server-side.
 */

export interface CodeStep {
  num: string;
  title: string;
  /** `backtick` spans render as inline code chips via renderProse. */
  prose: string;
  filename: string;
  rawCode: string;
  /**
   * Shiki-highlighted HTML for the code block. Injected via
   * `dangerouslySetInnerHTML` — must be trusted, app-owned, build-time
   * content (server-side Shiki output). Never derive it from user input.
   */
  html: string;
  /** Canonical docs URL surfaced as the step's "Docs →" link. */
  docsUrl: string;
}

export type CodePanelTabId = "sdk" | "api" | "webhooks" | "helpers";

export interface CodePanelProps {
  sdkSteps: CodeStep[];
  /** Optional — the API tab renders only when provided. */
  apiSteps?: CodeStep[];
  /** Optional — a Webhooks tab renders this node when provided. */
  webhooksPane?: React.ReactNode;
  /** Optional — a Helpers tab renders this node when provided. */
  helpersPane?: React.ReactNode;
  /** Optional notice rendered above every pane (e.g. sandbox note). */
  notice?: React.ReactNode;
  /**
   * Optional notice rendered above the steps on the SDK and API tabs
   * only (e.g. flow's mainnet-only note) — pane-slot tabs compose
   * their own intros inside the node they pass.
   */
  stepsNotice?: React.ReactNode;
  /**
   * Extra URL-hash aliases resolving to a tab, e.g.
   * `{ exchange: "helpers" }`. After the tab renders, the panel
   * scrolls to the element whose id matches the raw hash.
   */
  hashAliases?: Record<string, CodePanelTabId>;
}
