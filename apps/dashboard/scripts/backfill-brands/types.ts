/**
 * Phase 2-brands Part B — Brand backfill types.
 *
 * The script reads legacy data sources (BrandProfile aggregate, orphan
 * demo configs with embedded theme/branding) and emits canonical Brand
 * rows. These types define the seam between extractors (legacy in,
 * BrandSeed out) and the orchestrator (BrandSeed in, Brand row out).
 */

import type { CreateBrandInput } from "@/lib/services/types";
import type { RedisClient } from "@/lib/redis";
import type { BrandService } from "@/lib/services/types";

/**
 * A normalised brand seed: enough to create a Brand row and to
 * deterministically derive its id (so reruns dedupe).
 *
 * `source` lets the report attribute each Brand to the legacy record
 * it came from — useful when the next migration backfills `brandId`
 * onto demo configs.
 */
export interface BrandSeed extends CreateBrandInput {
  /**
   * Tag describing where the seed came from. Used in `BackfillReport`
   * to attribute Brand rows to legacy records and to skip duplicate
   * sources within a single run.
   */
  source: BrandSource;
}

export type BrandSourceKind =
  | "brand-profile"
  | "earn"
  | "wallet"
  | "checkout"
  | "remittance"
  | "trade"
  | "visa-direct";

export interface BrandSource {
  kind: BrandSourceKind;
  /** Legacy record id (BrandProfile id, EarnConfig id, etc.). */
  id: string;
}

/**
 * Per-record outcome from a single backfill run. Drives the printed
 * summary and is the assertion target in the run.test.ts cases.
 */
export interface BackfillRecordResult {
  source: BrandSource;
  outcome: "created" | "deduped" | "skipped" | "failed";
  brandId?: string;
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
 * fakes (in-memory Redis + in-memory BrandService) instead of touching
 * real infrastructure.
 */
export interface BackfillDeps {
  redis: RedisClient;
  brands: BrandService;
  /**
   * Optional logger — defaults to console.log in cli.ts. Tests pass a
   * recording logger to assert progress output is reasonable. Never
   * log secrets; only ids and counts.
   */
  log?: (msg: string) => void;
  /**
   * Override the deterministic id function. Production passes the real
   * `hashBrandKey`; tests can inject a counter to make assertions
   * easier when they don't care about the hash.
   */
  deriveId?: (seed: BrandSeed) => string;
}
