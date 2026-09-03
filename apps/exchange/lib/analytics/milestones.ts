/**
 * Exchange analytics taxonomy - GTM funnel events for the five-beat demo.
 *
 * Single source of truth for every name `useTrack().milestone(...)` emits
 * here; documented (trigger + props) in AGENTS.md "Analytics taxonomy".
 * Shared names (`signed_in`, `authenticated`, `wallet_funded`,
 * `send_initiated`, `send_completed`) keep cross-demo comparability.
 *
 * Never put addresses, emails or transaction hashes in props.
 */
export const EXCHANGE_MILESTONES = [
  "signed_in",
  "authenticated",
  "wallet_funded",
  "position_opened",
  "external_wallet_linked",
  "send_initiated",
  "send_completed",
  "device_lost",
  "wallet_recovered",
  "architecture_viewed",
] as const;

export type ExchangeMilestone = (typeof EXCHANGE_MILESTONES)[number];
