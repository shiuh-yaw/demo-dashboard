/**
 * Backfill orchestrator. Walks legacy keyspaces via the injected
 * RedisClient, drives each record through the appropriate extractor,
 * and writes seeds via the injected ProspectService.
 *
 * Task 6: pass 1 walks `ProspectProfile` aggregates and tracks linked
 * demo-config ids; pass 2 walks orphan earn / wallet / checkout /
 * remittance configs (excluding ones already linked by a profile).
 * Task 7 swaps `prospects.create` for `prospects.upsertWithId(deriveId, …)`
 * and adds the `deduped` outcome; Task 8 wraps each apply in
 * try/catch and adds the `failed` outcome.
 */

import { REDIS_KEYS } from "@/lib/redis";
import type {
  ProspectProfile,
  StoredCheckoutConfig,
  StoredEarnConfig,
  StoredRemittanceConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";

import {
  extractFromProspectProfile,
  extractFromCheckout,
  extractFromEarn,
  extractFromRemittance,
  extractFromWallet,
} from "./extractors";
import { hashProspectKey } from "./hash";
import type {
  BackfillDeps,
  BackfillRecordResult,
  BackfillReport,
  ProspectSeed,
  ProspectSource,
} from "./types";

function emptyTotals(): BackfillReport["totals"] {
  return { created: 0, deduped: 0, skipped: 0, failed: 0 };
}

interface IterItem {
  seed: ProspectSeed | null;
  skipReason?: string;
  source: ProspectSource;
}

interface ProfileIterItem extends IterItem {
  /**
   * Demo-config ids the ProspectProfile already references. Used to skip
   * those configs in the orphan pass so we don't double-create.
   */
  linkedDemoIds: ProspectProfile["demos"];
}

async function* iterateProspectProfiles(
  redis: BackfillDeps["redis"],
): AsyncGenerator<ProfileIterItem> {
  const ids = await redis.smembers(REDIS_KEYS.prospectProfileList);
  for (const id of ids) {
    const profile = await redis.get<ProspectProfile>(REDIS_KEYS.prospectProfile(id));
    if (!profile) {
      yield {
        seed: null,
        skipReason: "ProspectProfile id in list but record missing",
        source: { kind: "prospect-profile", id },
        linkedDemoIds: {},
      };
      continue;
    }
    const { seed, skipReason } = extractFromProspectProfile(profile);
    yield {
      seed,
      skipReason,
      source: { kind: "prospect-profile", id: profile.id },
      linkedDemoIds: profile.demos,
    };
  }
}

interface OrphanWalk {
  listKey: string;
  recordKey: (id: string) => string;
  kind: ProspectSource["kind"];
  // The cast is constrained to the four config types; each extractor
  // accepts its own narrow shape.
  extract: (raw: unknown) => { seed: ProspectSeed | null; skipReason?: string };
}

const orphanWalks: ReadonlyArray<OrphanWalk> = [
  {
    listKey: REDIS_KEYS.earnConfigList,
    recordKey: REDIS_KEYS.earnConfig,
    kind: "earn",
    extract: (c) => extractFromEarn(c as StoredEarnConfig),
  },
  {
    listKey: REDIS_KEYS.walletConfigList,
    recordKey: REDIS_KEYS.walletConfig,
    kind: "wallet",
    extract: (c) => extractFromWallet(c as StoredWalletConfig),
  },
  {
    listKey: REDIS_KEYS.checkoutConfigList,
    recordKey: REDIS_KEYS.checkoutConfig,
    kind: "checkout",
    extract: (c) => extractFromCheckout(c as StoredCheckoutConfig),
  },
  {
    listKey: REDIS_KEYS.remittanceConfigList,
    recordKey: REDIS_KEYS.remittanceConfig,
    kind: "remittance",
    extract: (c) => extractFromRemittance(c as StoredRemittanceConfig),
  },
];

async function* iterateOrphans(
  redis: BackfillDeps["redis"],
  linked: Set<string>,
): AsyncGenerator<IterItem> {
  for (const walk of orphanWalks) {
    const ids = await redis.smembers(walk.listKey);
    for (const id of ids) {
      if (linked.has(`${walk.kind}:${id}`)) continue;
      const record = await redis.get<unknown>(walk.recordKey(id));
      if (!record) {
        yield {
          seed: null,
          skipReason: `record missing for ${walk.kind}:${id}`,
          source: { kind: walk.kind, id },
        };
        continue;
      }
      const { seed, skipReason } = walk.extract(record);
      yield {
        seed,
        skipReason,
        source: { kind: walk.kind, id },
      };
    }
  }
}

export async function runBackfill(
  deps: BackfillDeps,
): Promise<BackfillReport> {
  const log = deps.log ?? (() => {});
  const deriveId = deps.deriveId ?? hashProspectKey;
  const results: BackfillRecordResult[] = [];

  // Pass 1 — ProspectProfile aggregates. Track linked demo configs so
  // pass 2 doesn't re-create them as orphans. Linkage uses the
  // demo-type kind: a ProspectProfile's `demos.earn = "earn_1"` means
  // "earn_1" is already represented by this profile's Prospect row.
  const linked = new Set<string>();
  for await (const item of iterateProspectProfiles(deps.redis)) {
    await applyItem(deps, item, log, results, deriveId);
    if (item.linkedDemoIds.earn) linked.add(`earn:${item.linkedDemoIds.earn}`);
    if (item.linkedDemoIds.wallet)
      linked.add(`wallet:${item.linkedDemoIds.wallet}`);
    if (item.linkedDemoIds.checkouts)
      linked.add(`checkout:${item.linkedDemoIds.checkouts}`);
    if (item.linkedDemoIds.remittance)
      linked.add(`remittance:${item.linkedDemoIds.remittance}`);
  }

  // Pass 2 — orphan demo configs.
  for await (const item of iterateOrphans(deps.redis, linked)) {
    await applyItem(deps, item, log, results, deriveId);
  }

  const totals = emptyTotals();
  for (const r of results) totals[r.outcome]++;
  return { results, totals };
}

async function applyItem(
  deps: BackfillDeps,
  item: IterItem,
  log: (m: string) => void,
  results: BackfillRecordResult[],
  deriveId: (s: ProspectSeed) => string,
) {
  if (!item.seed) {
    results.push({
      source: item.source,
      outcome: "skipped",
      reason: item.skipReason,
    });
    log(`skip ${item.source.kind}:${item.source.id} — ${item.skipReason}`);
    return;
  }
  const seed = item.seed;
  const id = deriveId(seed);
  try {
    // Probe for an existing row first so the report can distinguish
    // "created on this run" from "deduped against a prior run". The
    // upsert itself is idempotent either way.
    const existing = await deps.prospects.get(id);
    const row = await deps.prospects.upsertWithId(id, seed);
    if (existing) {
      results.push({
        source: item.source,
        outcome: "deduped",
        prospectId: row.id,
      });
      log(
        `deduped ${item.source.kind}:${item.source.id} → existing prospect ${row.id}`,
      );
    } else {
      results.push({
        source: item.source,
        outcome: "created",
        prospectId: row.id,
      });
      log(`created prospect ${row.id} from ${item.source.kind}:${item.source.id}`);
    }
  } catch (err) {
    // Record-scoped failure mode: surface in the report and keep
    // walking the rest of the keyspaces. Rerunning the script after
    // the underlying issue is fixed converges by virtue of the
    // deterministic id (idempotent upsert).
    const reason = err instanceof Error ? err.message : String(err);
    results.push({
      source: item.source,
      outcome: "failed",
      reason,
    });
    log(`FAILED ${item.source.kind}:${item.source.id} — ${reason}`);
  }
}
