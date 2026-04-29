// Pure helpers for the SubmitView stepper. Dynamic's
// `submitCheckoutTransaction` fires `onStepChange` with one of two values
// ("approval" | "transaction") as each in-wallet prompt begins. Approval is
// skipped for native gas tokens (ETH on its home chain, SOL on Solana, etc.)
// where the flow jumps straight to "transaction".
//
// We track the currently-announced step + the set of steps ever seen to
// render a four-state stepper: pending → active → done, plus a "skipped"
// badge for approval on native flows.

export type SubmitStepId = "approval" | "transaction";
export type SubmitStepStatus = "pending" | "active" | "done" | "skipped";

export function deriveSignStepStatus(
  id: SubmitStepId,
  current: SubmitStepId | null,
  seen: ReadonlySet<SubmitStepId>,
): SubmitStepStatus {
  if (current === id) return "active";
  if (seen.has(id)) return "done";
  // Approval gets skipped when Dynamic jumps straight to "transaction" (native
  // gas payments). Detect by: we never saw "approval" AND we've seen or are on
  // "transaction".
  if (
    id === "approval" &&
    (current === "transaction" || seen.has("transaction"))
  ) {
    return "skipped";
  }
  return "pending";
}
