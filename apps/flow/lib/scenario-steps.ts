/**
 * Scenario-flavored step definitions for the right-rail code panel.
 *
 * The 5 SDK / REST calls are the same shape across all three
 * scenarios — Create flow → Attach source → Quote → Submit →
 * Settle — but each scenario carries its own narrative around them.
 * We keep the structural metadata (step number, sdk/api filenames) in
 * one shared shape and only swap the scenario-specific `title` +
 * `prose` text.
 *
 * Centralising here means a copy edit to a step lands in one place
 * rather than three, and the structural-vs-narrative split surfaces
 * at module load instead of as gradual drift.
 */

import type { ScenarioMode } from "./flow-snippets";

export interface StepDef {
  /** Two-digit step number rendered in the stepper. */
  num: string;
  /** Step title shown above the prose + code. */
  title: string;
  /**
   * One-paragraph rationale. May contain `backtick`-delimited inline
   * code spans which `CodePanel`'s `renderProse` turns into chips.
   */
  prose: string;
  /** Filename label on the SDK-tab code frame (e.g. "flow.server.ts"). */
  sdkFile: string;
  /** Filename label on the REST-tab code frame (e.g. "create-flow.sh"). */
  apiFile: string;
}

/** Step filename pair shared across all three scenarios. Index = step. */
const STEP_FILENAMES = [
  { sdkFile: "flow.server.ts", apiFile: "create-flow.sh" },
  { sdkFile: "attach.ts", apiFile: "attach.sh" },
  { sdkFile: "quote.ts", apiFile: "quote.sh" },
  { sdkFile: "submit.ts", apiFile: "submit.sh" },
  { sdkFile: "settle.ts", apiFile: "settle.sh" },
] as const;

/** Scenario-specific (title, prose) pair per step. Index aligns with STEP_FILENAMES. */
type StepCopy = Array<{ title: string; prose: string }>;

const CHECKOUT_COPY: StepCopy = [
  {
    title: "Create the Flow",
    prose:
      "Server-side. Creates a flow with the buyer's amount, settlement asset(s), and merchant destination wallet — authenticated by an API token with `flow.write` scope. One flow per checkout when the amount or cart varies; reuse is possible only when amount and destination are identical.",
  },
  {
    title: "Attach the buyer's source",
    prose:
      "Declare the wallet and chain the buyer is paying from. Returns a session token (`dft_…`) that authenticates the rest of the lifecycle. Dynamic runs risk and sanctions screening here; a 403 means the source is blocked. Swap `sourceType` to `deposit_address` and the buyer gets a unique address to send to instead - no wallet connection or signing (BTC, SOL, EVM, TRON).",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the cross-chain swap from the buyer's chosen token to the settlement asset. Pass `fromChainId` from the picked token. Quotes expire in 60 seconds — re-quote if the buyer takes longer.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "Three things happen here: Dynamic prepares the signing payload, the buyer signs it in their wallet, and your client notifies Dynamic that the chain tx is broadcast. The SDK collapses all three into `submitFlowTransaction`; the REST path keeps them separate so you can plug in your own wallet client.",
  },
  {
    title: "Wait for settlement",
    prose:
      "Call `getFlow` to read `executionState` and `settlementState`. Production should subscribe to the `flow.settlement.updated` webhook for push-driven updates. Terminal success is `settlementState === \"completed\"`; terminal failure is `executionState` in `[\"failed\", \"expired\", \"cancelled\"]` or `settlementState === \"failed\"`.",
  },
];

const DEPOSIT_COPY: StepCopy = [
  {
    title: "Create the deposit Flow",
    prose:
      "Server-side. Creates a flow with the deposit amount, platform settlement asset, and the user's destination embedded wallet. Authenticated by an API token with `flow.write` scope.",
  },
  {
    title: "Attach the user's source wallet",
    prose:
      "Declare the wallet and chain the user is depositing from. Returns a session token (`dft_…`) for subsequent calls. Dynamic runs risk + sanctions screening here; a 403 means the source is blocked. Swap `sourceType` to `deposit_address` and the user gets a unique address to send to instead - no wallet connection or signing (BTC, SOL, EVM, TRON).",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the cross-chain swap from the user's chosen token into the platform's settlement asset. Quotes expire in 60 seconds — re-quote if the user takes longer to confirm.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "The user signs in their external wallet; Dynamic broadcasts and tracks settlement. SDK collapses prepare + sign + broadcast into `submitFlowTransaction`; REST keeps them separate so a custom wallet client can hook in.",
  },
  {
    title: "Wait for settlement",
    prose:
      "Call `getFlow` to read `executionState` and `settlementState`. Production should subscribe to the `flow.settlement.updated` webhook for push-driven updates. On `completed`, credit the user's platform balance; on `failed`, surface a retry path.",
  },
];

const WITHDRAW_COPY: StepCopy = [
  {
    title: "Create a withdraw Flow",
    prose:
      "Server-side, one per withdraw. Creates a flow via `POST /server/{envId}/flow/withdraw` with the user's destination address in `destinationConfig.destinations`. The payout amount and settlement asset are fixed at creation time.",
  },
  {
    title: "Attach the embedded wallet as source",
    prose:
      "Declare the wallet funds are being withdrawn from. For this demo it's the embedded wallet Dynamic provisioned during connect. Returns a session token (`dft_…`); a 403 means the source is blocked even when it's user-controlled.",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the swap from the picked source token in the embedded wallet to the settlement asset. Quotes expire in 60 seconds — re-quote if the user takes longer to confirm.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "The embedded wallet signs the on-chain transfer; Dynamic broadcasts and tracks settlement to the user-supplied destination address. SDK collapses prepare + sign + broadcast into `submitFlowTransaction`; REST keeps them separate.",
  },
  {
    title: "Wait for settlement",
    prose:
      "Call `getFlow` to read `executionState` and `settlementState`. Production should subscribe to the `flow.settlement.updated` webhook for push-driven updates. On `completed`, the destination wallet has received the funds; on `failed`, expose a retry with a fresh flow.",
  },
];

const COPY_BY_SCENARIO: Record<ScenarioMode, StepCopy> = {
  payment: CHECKOUT_COPY,
  deposit: DEPOSIT_COPY,
  withdraw: WITHDRAW_COPY,
};

/**
 * Return the 5-step definition list for a given scenario. Step
 * filenames are scenario-agnostic; only `title` + `prose` differ.
 */
export function getStepDefs(scenario: ScenarioMode): StepDef[] {
  const copy = COPY_BY_SCENARIO[scenario];
  return STEP_FILENAMES.map((files, i) => ({
    num: String(i + 1).padStart(2, "0"),
    title: copy[i]!.title,
    prose: copy[i]!.prose,
    sdkFile: files.sdkFile,
    apiFile: files.apiFile,
  }));
}
