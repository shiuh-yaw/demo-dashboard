/**
 * Phase 2-remittance backfill orchestrator.
 *
 * Walks `dashboard:remittance:<id>` (the legacy `StoredRemittanceConfig`
 * keyspace), upserts a Brand for each via the shared `hashBrandKey`
 * derivation (re-used from the brand backfill so theme rules stay in
 * lockstep), and upserts a `RemittanceConfig` row with the **legacy id
 * preserved** (Q-014). Re-running is idempotent: deterministic Brand id +
 * caller-supplied RemittanceConfig id collapse re-runs onto the existing
 * rows.
 *
 * Records that fail surface in the report with `outcome: "failed"` so the
 * script keeps going past record-scoped errors and a re-run picks them up
 * after the underlying issue is fixed.
 */

import { REDIS_KEYS } from "@/lib/redis";
import type { StoredRemittanceConfig } from "@/lib/types/dashboard";
import type { CreateBrandInput } from "@/lib/services/types";

import { extractFromRemittance } from "../backfill-brands/extractors";
import { hashBrandKey } from "../backfill-brands/hash";
import type {
  RemittanceBackfillDeps,
  RemittanceBackfillRecordResult,
  RemittanceBackfillReport,
} from "./types";

function emptyTotals(): RemittanceBackfillReport["totals"] {
  return { created: 0, deduped: 0, skipped: 0, failed: 0 };
}

export async function runRemittanceBackfill(
  deps: RemittanceBackfillDeps,
): Promise<RemittanceBackfillReport> {
  const log = deps.log ?? (() => {});
  const results: RemittanceBackfillRecordResult[] = [];

  const ids = await deps.redis.smembers(REDIS_KEYS.remittanceConfigList);
  for (const id of ids) {
    const record = await deps.redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(id),
    );
    if (!record) {
      results.push({
        source: { id },
        outcome: "skipped",
        reason: "record missing for id in list",
      });
      log(`skip ${id} — record missing`);
      continue;
    }
    if (!record.ownerId) {
      results.push({
        source: { id },
        outcome: "skipped",
        reason: "missing ownerId — orphan legacy config",
      });
      log(`skip ${id} — orphan (no ownerId)`);
      continue;
    }
    // Reuse the brands extractor so theme rules stay in lockstep with
    // the Phase 2-brands backfill. The extractor returns null +
    // skipReason when the embedded theme is malformed (no primaryColor,
    // bad hex, etc.).
    const { seed: brandSeed, skipReason } = extractFromRemittance(record);
    if (!brandSeed) {
      results.push({
        source: { id },
        outcome: "skipped",
        reason: `cannot derive brand seed: ${skipReason}`,
      });
      log(`skip ${id} — ${skipReason}`);
      continue;
    }
    try {
      // Strip the source tag before passing to BrandService — that
      // field is internal to the brand backfill report shape.
      const createBrandInput: CreateBrandInput = {
        ownerId: brandSeed.ownerId,
        name: brandSeed.name,
        description: brandSeed.description ?? null,
        primaryColor: brandSeed.primaryColor,
        secondaryColor: brandSeed.secondaryColor ?? null,
        accentColor: brandSeed.accentColor ?? null,
        logoUrl: brandSeed.logoUrl ?? null,
      };
      const brandId = hashBrandKey(brandSeed);
      await deps.brands.upsertWithId(brandId, createBrandInput);

      // Probe for an existing remittance row first so the report can
      // distinguish "created on this run" from "deduped against a prior
      // run". The upsert itself is idempotent either way.
      const existing = await deps.remittanceConfigs.get(id);
      const row = await deps.remittanceConfigs.upsertWithId(id, {
        ownerId: record.ownerId,
        name: record.name,
        description: record.description ?? null,
        brandId,
        config: record.config,
      });
      if (existing) {
        results.push({
          source: { id },
          outcome: "deduped",
          configId: row.id,
          brandId,
        });
        log(`deduped ${id} (brand ${brandId})`);
      } else {
        results.push({
          source: { id },
          outcome: "created",
          configId: row.id,
          brandId,
        });
        log(`created remittance ${id} (brand ${brandId})`);
      }
    } catch (err) {
      // Record-scoped failure mode: surface in the report and keep
      // walking. Rerunning the script after the underlying issue is
      // fixed converges by virtue of the deterministic Brand id and
      // the preserved legacy RemittanceConfig id.
      const reason = err instanceof Error ? err.message : String(err);
      results.push({ source: { id }, outcome: "failed", reason });
      log(`FAILED ${id} — ${reason}`);
    }
  }

  const totals = emptyTotals();
  for (const r of results) totals[r.outcome]++;
  return { results, totals };
}
