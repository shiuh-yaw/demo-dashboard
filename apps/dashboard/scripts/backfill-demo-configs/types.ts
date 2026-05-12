/**
 * Phase 2 unified-DemoConfig backfill types.
 *
 * The script walks each legacy per-type Redis keyspace
 * (`dashboard:earn:<id>`, `dashboard:wallet:<id>`,
 * `dashboard:trade:<id>`, `dashboard:visa-direct:<id>`,
 * `dashboard:remittance:<id>`, `payment-widget:config:<id>` for
 * checkouts), upserts a Brand row for the embedded theme (idempotent
 * via `hashBrandKey` from the brand backfill), then upserts a
 * `DemoConfig` row that links to that Brand with `kind=<demoType>`.
 * Legacy ids are preserved (Q-014) so existing demo URLs keep
 * resolving unchanged.
 *
 * Remittance is included here as `kind="remittance"` — the legacy
 * per-type `RemittanceConfig` table has been folded into `DemoConfig`
 * (see `packages/db/prisma/migrations/<ts>_fold_remittance_into_demo_config`).
 */

import type { RedisClient } from "@/lib/redis";
import type {
  BrandService,
  DemoConfigKind,
  DemoConfigService,
} from "@/lib/services/types";

/**
 * Demo kinds covered by this backfill. Currently the full
 * `DemoConfigKind` set: earn, wallet, trade, visa-direct, checkout,
 * remittance. The alias stays so callers and tests can scope a run to
 * a subset of kinds without rewiring.
 */
export type BackfillDemoKind = DemoConfigKind;

export const BACKFILL_KINDS: readonly BackfillDemoKind[] = [
  "earn",
  "wallet",
  "trade",
  "visa-direct",
  "checkout",
  "remittance",
] as const;

export interface DemoConfigsBackfillSource {
  /** Legacy id from the per-type Redis keyspace. */
  id: string;
  /** Which legacy store this id came from. */
  kind: BackfillDemoKind;
}

export interface DemoConfigsBackfillRecordResult {
  source: DemoConfigsBackfillSource;
  outcome: "created" | "deduped" | "skipped" | "failed";
  /** Set when `outcome === "created" | "deduped"`. */
  configId?: string;
  /** Brand row used for the FK; set when create/dedupe succeeds. */
  brandId?: string;
  reason?: string;
}

export interface DemoConfigsBackfillReport {
  results: DemoConfigsBackfillRecordResult[];
  /** Convenience aggregates so callers don't have to re-tally. */
  totals: {
    created: number;
    deduped: number;
    skipped: number;
    failed: number;
  };
  /** Per-kind aggregates so an operator can spot which kind failed. */
  byKind: Record<
    BackfillDemoKind,
    {
      created: number;
      deduped: number;
      skipped: number;
      failed: number;
    }
  >;
}

/**
 * Dependencies the orchestrator needs. Injected so unit tests use
 * fakes (in-memory Redis + in-memory services) instead of touching
 * real infrastructure.
 */
export interface DemoConfigsBackfillDeps {
  redis: RedisClient;
  brands: BrandService;
  demoConfigs: DemoConfigService;
  /**
   * Optional logger — defaults to a no-op. Tests inject a recording
   * logger to assert progress output is reasonable. Never log secrets;
   * only ids, kinds, and counts.
   */
  log?: (msg: string) => void;
  /**
   * Restrict the run to a subset of kinds. Defaults to every kind in
   * `BACKFILL_KINDS`. Test-only knob; CLI doesn't expose it.
   */
  kinds?: readonly BackfillDemoKind[];
}
