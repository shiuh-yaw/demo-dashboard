/**
 * Pure completion logic for the dashboard-home "Getting started" checklist
 * (Phase 3). Takes booleans already computed from data `OverviewPage` fetches
 * (or a bounded count query) and decides which items are done and whether the
 * whole checklist should render at all. No I/O, no cookies, no server-env -
 * safe to unit test directly and safe to import from a client component.
 */

export type ChecklistItemId = "profile" | "prospect" | "demo" | "share";

export const CHECKLIST_ITEM_IDS: readonly ChecklistItemId[] = [
  "profile",
  "prospect",
  "demo",
  "share",
];

export interface ChecklistCompletionInput {
  /** `user.displayName && user.schedulingUrl` are both set. */
  profileComplete: boolean;
  /** The operator has >=1 prospect in scope. */
  hasProspect: boolean;
  /** Any prospect in scope has >=1 demo. */
  hasDemo: boolean;
  /** The operator has minted >=1 share link (any status). */
  hasShare: boolean;
}

export type ChecklistCompletion = Record<ChecklistItemId, boolean>;

/** Maps the raw booleans onto the fixed set of checklist item ids. */
export function computeChecklistCompletion(
  input: ChecklistCompletionInput,
): ChecklistCompletion {
  return {
    profile: input.profileComplete,
    prospect: input.hasProspect,
    demo: input.hasDemo,
    share: input.hasShare,
  };
}

/** True once every item is done - the checklist renders nothing at that point. */
export function isChecklistComplete(completion: ChecklistCompletion): boolean {
  return CHECKLIST_ITEM_IDS.every((id) => completion[id]);
}
