/**
 * Phase 2-remittance backfill types.
 *
 * The script reads the legacy `dashboard:remittance:<id>` keyspace,
 * upserts a Brand row for the embedded theme (idempotent via
 * `hashBrandKey` from the brand backfill), then upserts a
 * `RemittanceConfig` row that links to that Brand. Legacy ids are
 * preserved (Q-014) so existing demo URLs keep resolving unchanged.
 */

import type { RedisClient } from "@/lib/redis";
import type {
  BrandService,
  RemittanceConfigService,
} from "@/lib/services/types";

export interface RemittanceBackfillSource {
  /** Legacy RemittanceConfig id from `dashboard:remittance:<id>`. */
  id: string;
}

export interface RemittanceBackfillRecordResult {
  source: RemittanceBackfillSource;
  outcome: "created" | "deduped" | "skipped" | "failed";
  /** Set when `outcome === "created" | "deduped"`. */
  configId?: string;
  /** Brand row used for the FK; set when create/dedupe succeeds. */
  brandId?: string;
  reason?: string;
}

export interface RemittanceBackfillReport {
  results: RemittanceBackfillRecordResult[];
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
 * fakes (in-memory Redis + in-memory services) instead of touching
 * real infrastructure.
 */
export interface RemittanceBackfillDeps {
  redis: RedisClient;
  brands: BrandService;
  remittanceConfigs: RemittanceConfigService;
  /**
   * Optional logger — defaults to a no-op. Tests inject a recording
   * logger to assert progress output is reasonable. Never log secrets;
   * only ids and counts.
   */
  log?: (msg: string) => void;
}
