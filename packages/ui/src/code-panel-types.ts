/**
 * Public types for <CodePanel /> and its panes. Generalized from
 * apps/flow/components/code-panel-types.ts: only the step contract is
 * lifted; flow's helpers/webhooks/AI card types stay flow-local until
 * its migration PR. Code is carried as pre-highlighted HTML (`html`)
 * plus the raw string (`rawCode`) for the copy button — this package
 * takes no Shiki dependency; apps highlight server-side.
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

export interface CodePanelProps {
  sdkSteps: CodeStep[];
  /** Optional — the API tab renders only when provided. */
  apiSteps?: CodeStep[];
  /** Optional — a Webhooks tab renders this node when provided. */
  webhooksPane?: React.ReactNode;
  /** Optional notice rendered above every pane (e.g. sandbox note). */
  notice?: React.ReactNode;
}
