/**
 * Connect analytics taxonomy.
 *
 * `ConnectMilestone` is the single source of truth for every event name this app
 * emits via `useTrack().milestone(...)`. Documented (trigger + props shape) in
 * `AGENTS.md`'s "Analytics taxonomy" section - keep both in sync. Renaming any of
 * these is a breaking analytics change.
 *
 * The funnel this measures is narrow on purpose. Connect's whole job is a
 * hand-off, so the question is where users fall out of it:
 *
 *   wallet_selected  ->  wallet_connected  ->  handoff_confirmed
 *
 * `handoff_confirmed` is the conversion, and it is a separate event from
 * `wallet_connected` precisely because the confirmation screen is manual - the
 * gap between the two is the number that tells us whether asking the user to
 * check the account before continuing costs completions.
 */

export const CONNECT_MILESTONES = [
  "wallet_selected",
  "chain_selected",
  "wallet_connected",
  "handoff_confirmed",
  "manual_address_submitted",
  "connect_failed",
] as const;

export type ConnectMilestone = (typeof CONNECT_MILESTONES)[number];
