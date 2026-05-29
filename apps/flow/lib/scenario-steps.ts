/**
 * Scenario-flavored step definitions for the right-rail code panel.
 *
 * The 6 SDK / REST calls are the same shape across all three
 * scenarios — Create Flow → Create transaction → Attach source →
 * Quote → Submit → Settle — but each scenario carries its own
 * narrative around them. We keep the structural metadata (step
 * number, sdk/api filenames) in one shared shape and only swap the
 * scenario-specific `title` + `prose` text.
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
  { sdkFile: "transaction.ts", apiFile: "create-transaction.sh" },
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
      "Server-side. Defines the merchant-facing settlement asset(s) and destination wallet(s) — uses your environment-scoped API token. Reuse a single Flow across many buyer transactions when the merchant config is shared (e.g. fixed-amount deposits). For ecommerce checkouts where each cart has a different amount or line items, create one Flow per checkout instead.",
  },
  {
    title: "Create a Flow transaction",
    prose:
      "Per buyer. Opens a transaction against the Flow id from Step 01 and returns a session token used to authenticate the rest of the buyer's lifecycle.",
  },
  {
    title: "Attach the buyer's source",
    prose:
      "Declare the wallet the buyer is paying from. Dynamic runs risk and sanctions screening here; a 403 means the source is blocked.",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the cross-chain swap from the buyer's chosen token to the settlement asset. Quotes expire in 60 seconds — re-quote if the buyer takes longer.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "Three things happen here: Dynamic prepares the signing payload, the buyer signs it in their wallet, and your client notifies Dynamic that the chain tx is broadcast. The SDK collapses all three into one helper; the REST path keeps them separate so you can plug in your own wallet client.",
  },
  {
    title: "Wait for settlement",
    prose:
      "We poll the transaction endpoint every ~3 seconds so the settlement lifecycle stays visible in the demo. Production should subscribe to the `checkout.transaction.settlement.updated` webhook instead — push-driven, no idle polling. Either way, wait for settlementState to reach `completed` or `failed`.",
  },
];

const DEPOSIT_COPY: StepCopy = [
  {
    title: "Create the deposit Flow",
    prose:
      "Server-side. Defines the platform-facing settlement asset (where deposits land) and the user's destination wallet. Reuse a single Flow across many user deposits — the `destinationConfig.destinations` entry identifies which user's wallet to credit on each transaction.",
  },
  {
    title: "Create a deposit transaction",
    prose:
      "Per user. Opens a transaction against the Flow id and returns a session token that authenticates the rest of this user's deposit lifecycle.",
  },
  {
    title: "Attach the user's source wallet",
    prose:
      "Declare the wallet the user is depositing from. Dynamic runs risk + sanctions screening here; a 403 means the source is blocked.",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the cross-chain swap from the user's chosen token into the platform's settlement asset. Quotes expire in 60 seconds — re-quote if the user takes longer to confirm.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "Three things happen here: Dynamic prepares the signing payload, the user signs in their external wallet, and your client notifies Dynamic that the chain tx is broadcast. The SDK collapses all three into one helper; the REST path keeps them separate so you can plug in your own wallet client.",
  },
  {
    title: "Wait for settlement",
    prose:
      "We poll the transaction endpoint every ~3 seconds so the settlement lifecycle stays visible in the demo. Production should subscribe to the `checkout.transaction.settlement.updated` webhook instead — push-driven, no idle polling. On `completed`, credit the user's platform balance; on `failed`, surface a retry path.",
  },
];

const WITHDRAW_COPY: StepCopy = [
  {
    title: "Create a withdraw Flow",
    prose:
      "Server-side, one per withdraw. The destination address comes from the user, so each withdraw mints its own Flow via `POST /environments/{envId}/checkouts` with the user's address in `destinationConfig.destinations[0].identifier`. Dynamic's API only accepts `mode: \"payment\" | \"deposit\"` — a withdraw is sent as `\"deposit\"` because it's conceptually a deposit into the user's destination wallet.",
  },
  {
    title: "Create a withdraw transaction",
    prose:
      "Opens a transaction against the freshly-minted Flow id and returns a session token that authenticates the rest of this withdraw's lifecycle.",
  },
  {
    title: "Attach the embedded wallet as source",
    prose:
      "Declare the wallet funds are being withdrawn from. For this demo it's the embedded wallet Dynamic provisioned during connect; Dynamic still runs risk + sanctions screening here, so a 403 means the source is blocked even when it's user-controlled.",
  },
  {
    title: "Get a quote",
    prose:
      "Quote the swap from the picked source token in the embedded wallet to the settlement asset. Quotes expire in 60 seconds — re-quote if the user takes longer to confirm.",
  },
  {
    title: "Prepare, sign, and broadcast",
    prose:
      "The embedded wallet signs the on-chain transfer; Dynamic broadcasts and tracks settlement to the user-supplied destination address. SDK collapses prepare + sign + broadcast into one call; REST keeps them separate so a custom wallet client can hook in.",
  },
  {
    title: "Wait for settlement",
    prose:
      "We poll the transaction endpoint every ~3 seconds so the settlement lifecycle stays visible in the demo. Production should subscribe to the `checkout.transaction.settlement.updated` webhook instead — push-driven, no idle polling. On `completed`, the destination wallet has received the funds; on `failed`, expose a retry with a fresh Checkout (the original one is single-use).",
  },
];

const COPY_BY_SCENARIO: Record<ScenarioMode, StepCopy> = {
  payment: CHECKOUT_COPY,
  deposit: DEPOSIT_COPY,
  withdraw: WITHDRAW_COPY,
};

/**
 * Return the 6-step definition list for a given scenario. Step
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
