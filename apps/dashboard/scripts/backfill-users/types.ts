/**
 * Phase GTM-03.5A - backfill-users types.
 *
 * The script lists Dynamic environment users, upserts a `User` row for each
 * allowlisted email, links `dynamicUserId`, ensures default-team membership,
 * and re-runs the `createdById` resolution. Types define the seam between the
 * Dynamic admin client (network in) and the orchestrator (services out) so
 * unit tests drive it with in-memory fakes.
 */

import type { GtmUserService, TeamService } from "@/lib/services/types";

/** One directory entry from the Dynamic admin API. */
export interface DynamicDirectoryUser {
  /** Dynamic user id (JWT `sub`); written to `User.dynamicUserId`. */
  userId: string;
  /** Primary verified email; empty/unverified entries are skipped upstream. */
  email: string;
}

/** Minimal Dynamic admin client the orchestrator depends on. */
export interface DynamicDirectoryClient {
  listEnvironmentUsers(): Promise<DynamicDirectoryUser[]>;
}

export type BackfillUserOutcome =
  | "linked"
  | "already-linked"
  | "skipped-domain"
  | "skipped-conflict"
  | "would-link";

export interface BackfillUserResult {
  email: string;
  outcome: BackfillUserOutcome;
  reason?: string;
}

export interface BackfillUsersReport {
  results: BackfillUserResult[];
  totals: {
    usersUpserted: number;
    membershipsEnsured: number;
    prospectsClaimed: number;
    demoConfigsClaimed: number;
    skipped: number;
  };
}

export interface BackfillUsersDeps {
  client: DynamicDirectoryClient;
  users: GtmUserService;
  teams: TeamService;
  /** Lowercased email domains that pass the allowlist (GTM_ALLOWED_DOMAINS). */
  allowedDomains: string[];
  /** When true, computes the plan and writes nothing. */
  dryRun?: boolean;
  log?: (msg: string) => void;
}
