/**
 * Per-scenario CodePanel props builder.
 *
 * Each scenario page (`/checkout`, `/deposit`, `/withdraw`) needs the
 * same kind of work before rendering `<CodePanel />`: run the SDK +
 * REST snippet generators, server-side highlight everything via Shiki,
 * map the results into the panel's typed shape, and ship the result.
 *
 * Centralising the work here means the three pages collapse to a tiny
 * config block + one `await` instead of ~80 lines of identical
 * boilerplate each. The function returns a single object the page
 * spreads into `<CodePanel {...props} />`.
 */

import { highlight } from "./code-highlight";
import {
  WEBHOOK_DOCS_URL,
  WEBHOOK_EVENTS,
  WEBHOOK_HANDLER_CODE,
  type ScenarioExtras,
} from "./flow-helpers";
import {
  STEP_API_DOCS_URLS,
  STEP_SDK_DOCS_URLS,
  renderApiSteps,
  renderSdkSteps,
  type FlowSnippetContext,
  type ScenarioMode,
} from "./flow-snippets";
import { getStepDefs } from "./scenario-steps";
import type {
  CodePanelProps,
  CodeStep,
  HelperCard,
  WebhookEventCard,
  WebhookHandlerCard,
} from "@/components/code-panel";

/**
 * Build the complete `CodePanelProps` for a scenario page.
 *
 * @param ctx     Snippet rendering context (FlowConfig + mode +
 *                destination/source address placeholders).
 * @param extras  Per-scenario helpers + AI prompt block (see
 *                `flow-helpers.ts`).
 * @param scenario The intent-named scenario id; used to look up the
 *                 6-step copy from `scenario-steps.ts`.
 */
export async function buildCodePanelProps(
  ctx: FlowSnippetContext,
  extras: ScenarioExtras,
  scenario: ScenarioMode,
): Promise<CodePanelProps> {
  const stepDefs = getStepDefs(scenario);
  const sdkCodes = renderSdkSteps(ctx);
  const apiCodes = renderApiSteps(ctx);
  const helperDefs = extras.helpers;

  // All highlights fire in parallel — Shiki's singleton highlighter
  // shares grammars across calls so the wall-clock is bounded by the
  // slowest input rather than summed.
  const [sdkHtmls, apiHtmls, helperHtmls, webhookHandlerHtml, webhookEventHtmls] =
    await Promise.all([
      Promise.all(sdkCodes.map((code) => highlight(code, "typescript"))),
      Promise.all(apiCodes.map((code) => highlight(code, "bash"))),
      Promise.all(helperDefs.map((h) => highlight(h.rawCode, "typescript"))),
      highlight(WEBHOOK_HANDLER_CODE, "typescript"),
      Promise.all(WEBHOOK_EVENTS.map((e) => highlight(e.rawPayload, "json"))),
    ]);

  const sdkSteps: CodeStep[] = stepDefs.map((def, i) => ({
    num: def.num,
    title: def.title,
    prose: def.prose,
    filename: def.sdkFile,
    rawCode: sdkCodes[i]!,
    html: sdkHtmls[i]!,
    docsUrl: STEP_SDK_DOCS_URLS[i]!,
  }));
  const apiSteps: CodeStep[] = stepDefs.map((def, i) => ({
    num: def.num,
    title: def.title,
    prose: def.prose,
    filename: def.apiFile,
    rawCode: apiCodes[i]!,
    html: apiHtmls[i]!,
    docsUrl: STEP_API_DOCS_URLS[i]!,
  }));
  const helpers: HelperCard[] = helperDefs.map((h, i) => ({
    ...h,
    html: helperHtmls[i]!,
  }));
  const webhookHandler: WebhookHandlerCard = {
    rawCode: WEBHOOK_HANDLER_CODE,
    html: webhookHandlerHtml,
  };
  const webhookEvents: WebhookEventCard[] = WEBHOOK_EVENTS.map((e, i) => ({
    ...e,
    html: webhookEventHtmls[i]!,
  }));

  return {
    sdkSteps,
    apiSteps,
    helpers,
    ai: extras.ai,
    webhookHandler,
    webhookEvents,
    webhookDocsUrl: WEBHOOK_DOCS_URL,
  };
}
