/**
 * Phase 2-brands Part B — Prospect backfill types.
 *
 * The script reads legacy data sources (ProspectProfile aggregate, orphan
 * demo configs with embedded theme/branding) and emits canonical Prospect
 * rows. These types define the seam between extractors (legacy in,
 * ProspectSeed out) and the orchestrator (ProspectSeed in, Prospect row out).
 */

import type { CreateProspectInput } from "@/lib/services/types";
import type { RedisClient } from "@/lib/redis";
import type { ProspectService } from "@/lib/services/types";

/**
 * A normalised prospect seed: enough to create a Prospect row and to
 * deterministically derive its id (so reruns dedupe).
 *
 * `source` lets the report attribute each Prospect to the legacy record
 * it came from — useful when the next migration backfills `prospectId`
 * onto demo configs.
 */
export interface ProspectSeed extends CreateProspectInput {
  /**
   * Tag describing where the seed came from. Used in `BackfillReport`
   * to attribute Prospect rows to legacy records and to skip duplicate
   * sources within a single run.
   */
  source: ProspectSource;
}

export type ProspectSourceKind =
  | "prospect-profile"
  | "earn"
  | "wallet"
  | "checkout"
  | "remittance"
  | "trade"
  | "visa-direct";

export interface ProspectSource {
  kind: ProspectSourceKind;
  /** Legacy record id (ProspectProfile id, EarnConfig id, etc.). */
  id: string;
}

/**
 * Per-record outcome from a single backfill run. Drives the printed
 * summary and is the assertion target in the run.test.ts cases.
 */
export interface BackfillRecordResult {
  source: ProspectSource;
  outcome: "created" | "deduped" | "skipped" | "failed";
  prospectId?: string;
  reason?: string;
}

export interface BackfillReport {
  results: BackfillRecordResult[];
  /** Convenience aggregates so callers don't have to re-tally. */
  totals: {
    created: number;
    deduped: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Dependencies the orchestrator needs. Injected so unit tests use
 * fakes (in-memory Redis + in-memory ProspectService) instead of touching
 * real infrastructure.
 */
export interface BackfillDeps {
  redis: RedisClient;
  prospects: ProspectService;
  /**
   * Optional logger — defaults to console.log in cli.ts. Tests pass a
   * recording logger to assert progress output is reasonable. Never
   * log secrets; only ids and counts.
   */
  log?: (msg: string) => void;
  /**
   * Override the deterministic id function. Production passes the real
   * `hashProspectKey`; tests can inject a counter to make assertions
   * easier when they don't care about the hash.
   */
  deriveId?: (seed: ProspectSeed) => string;
}
