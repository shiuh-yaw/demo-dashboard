/**
 * Public types for the right-rail `<CodePanel />` and its panes.
 *
 * Lives in its own module so the pane components can consume the
 * types without importing from `code-panel.tsx` (which would create a
 * circular import: orchestrator → pane → orchestrator-types).
 *
 * `code-panel.tsx` re-exports everything below so external call sites
 * (`apps/flow/lib/build-code-panel-props.ts`, the scenario pages)
 * continue to import from `@/components/code-panel` unchanged.
 */

export interface CodeStep {
  num: string;
  title: string;
  prose: string;
  filename: string;
  rawCode: string;
  html: string;
  /** Canonical Dynamic docs URL surfaced as a "Read the docs" link. */
  docsUrl: string;
}

export interface HelperCard {
  id: string;
  /** [functionName, "(args)"] tuple. */
  sig: [string, string];
  tag: string;
  /** Backtick-delimited inline code spans become chips via `renderProse`. */
  desc: string;
  rawCode: string;
  html: string;
  /**
   * Canonical Dynamic docs URL surfaced as a "Read the docs" link.
   * Optional — omit on scenario-flavoured variants that don't have
   * their own dedicated docs page (the card renders without the link).
   */
  docsUrl?: string;
}

export interface AiPromptContent {
  eyebrow: string;
  title: string;
  sub: string;
  rawPrompt: string;
}

export interface WebhookEventCard {
  id: string;
  name: string;
  tag: string;
  desc: string;
  rawPayload: string;
  /** Shiki-highlighted JSON payload. */
  html: string;
  /**
   * Canonical Dynamic docs URL for THIS event's payload schema —
   * deep-links into the `#param-…` anchor on the events-overview page.
   * Per-event so each card's "Read the docs →" lands the reader on
   * the matching schema section.
   */
  docsUrl: string;
}

export interface WebhookHandlerCard {
  rawCode: string;
  /** Shiki-highlighted TypeScript handler. */
  html: string;
}

export interface CodePanelProps {
  sdkSteps: CodeStep[];
  apiSteps: CodeStep[];
  helpers: HelperCard[];
  ai: AiPromptContent;
  webhookHandler: WebhookHandlerCard;
  webhookEvents: WebhookEventCard[];
  /**
   * Single canonical Dynamic docs URL for the whole Webhooks tab —
   * the handler "Read the docs →" link and each event card share it.
   * Owned by `lib/flow-helpers.ts` as `WEBHOOK_DOCS_URL` so a repoint
   * is a one-line change.
   */
  webhookDocsUrl: string;
}
