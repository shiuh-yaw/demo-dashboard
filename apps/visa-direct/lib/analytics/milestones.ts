/**
 * Visa Direct analytics taxonomy.
 * Keep in sync with AGENTS.md "Analytics taxonomy" section.
 */

export const VISA_DIRECT_MILESTONES = [
  "signed_in",
  "wallet_created",
  "wallet_connected",
  "payout_initiated",
  "payout_completed",
] as const;

export type VisaDirectMilestone = (typeof VISA_DIRECT_MILESTONES)[number];
