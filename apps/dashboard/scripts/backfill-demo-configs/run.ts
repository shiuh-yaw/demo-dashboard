/**
 * Phase 2 unified-DemoConfig backfill orchestrator.
 *
 * Walks each legacy per-type Redis keyspace and upserts both the
 * Prospect row (via `hashProspectKey` — same derivation as the prospect
 * backfill so theme rules stay in lockstep) and the matching
 * `DemoConfig` row with the **legacy id preserved** (Q-014). Re-running
 * is idempotent: deterministic Prospect id + caller-supplied DemoConfig
 * id collapse re-runs onto the existing rows.
 *
 * Records that fail surface in the report with `outcome: "failed"` so
 * a record-scoped error doesn't stop the run — a re-run after the
 * underlying issue is fixed picks them up.
 *
 * Remittance is included here as `kind="remittance"` — the legacy
 * per-type `RemittanceConfig` table has been folded into `DemoConfig`
 * by the `fold_remittance_into_demo_config` migration. The legacy
 * `dashboard:remittance:<id>` Redis keyspace continues to back
 * `lib/actions/remittance.ts` until the action-layer cutover lands.
 */

import { REDIS_KEYS } from "@/lib/redis";
import type {
  StoredCheckoutConfig,
  StoredEarnConfig,
  StoredRemittanceConfig,
  StoredTradeConfig,
  StoredVisaDirectConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";
import type {
  CreateProspectInput,
  CreateDemoConfigInput,
  UpdateProspectInput,
} from "@/lib/services/types";

import {
  extractFromCheckout,
  extractFromEarn,
  extractFromRemittance,
  extractFromWallet,
} from "../backfill-prospects/extractors";
import { hashProspectKey } from "../backfill-prospects/hash";
import type {
  BackfillDemoKind,
  DemoConfigsBackfillDeps,
  DemoConfigsBackfillRecordResult,
  DemoConfigsBackfillReport,
} from "./types";
import { BACKFILL_KINDS } from "./types";

/**
 * Maps the unified DemoConfig `kind` to the corresponding denormalized
 * back-reference column on `Prospect`. The prospect-edit page surfaces four
 * demo kinds today (earn/checkout/wallet/remittance); trade and
 * visa-direct have no column and intentionally fall outside this map
 * (the link step is a no-op for them).
 */
const DEMO_KIND_TO_PROSPECT_FIELD: Partial<
  Record<BackfillDemoKind, keyof Pick<UpdateProspectInput, "demoEarnId" | "demoCheckoutsId" | "demoWalletId" | "demoRemittanceId">>
> = {
  earn: "demoEarnId",
  checkout: "demoCheckoutsId",
  wallet: "demoWalletId",
  remittance: "demoRemittanceId",
};

/**
 * Per-kind Redis adapter. Every legacy store has a (list, value)
 * key pair and a slightly different stored shape; this table is the
 * single place that knows how each one is wired.
 *
 * Trade and Visa Direct have no prospect-extractor helper today (the
 * prospect backfill never crawled them — they were rarely themed). We
 * derive a prospect seed inline from the embedded theme; same hex rules
 * as `extractors.ts` but narrower in scope (primaryColor only).
 */
interface SkipResult {
  skipReason: string;
}

interface LegacyStore {
  kind: BackfillDemoKind;
  listKey: string;
  itemKey: (id: string) => string;
  resolve: (raw: unknown, id: string) => ResolvedLegacy | SkipResult;
}

interface ResolvedLegacy {
  ownerId: string;
  name: string;
  description: string | null;
  prospectInput: CreateProspectInput;
  prospectId: string;
  /** Demo-specific payload — everything except the embedded theme. */
  configPayload: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Inline prospect-seed derivation for stores the prospect backfill never
 * walked. Mirrors `extractors.ts` for the primaryColor-only path.
 */
type FallbackResult =
  | { ok: true; seed: CreateProspectInput }
  | { ok: false; skipReason: string };

function fallbackProspect(
  ownerId: string | undefined,
  name: string,
  description: string | null,
  theme: unknown,
): FallbackResult {
  if (!ownerId) return { ok: false, skipReason: "missing ownerId" };
  if (!isObject(theme))
    return { ok: false, skipReason: "missing theme on legacy config" };
  const primary = theme.primaryColor;
  if (typeof primary !== "string" || !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(primary)) {
    return {
      ok: false,
      skipReason: `invalid primaryColor (${typeof primary})`,
    };
  }
  return {
    ok: true,
    seed: {
      ownerId,
      name,
      description,
      primaryColor: primary.toLowerCase(),
    },
  };
}

const STORES: readonly LegacyStore[] = [
  {
    kind: "earn",
    listKey: REDIS_KEYS.earnConfigList,
    itemKey: (id) => REDIS_KEYS.earnConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredEarnConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      const { seed, skipReason } = extractFromEarn(stored);
      if (!seed) return { skipReason: skipReason ?? "could not derive prospect" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        prospectId: hashProspectKey(seed),
        configPayload: stored.config,
      };
    },
  },
  {
    kind: "wallet",
    listKey: REDIS_KEYS.walletConfigList,
    itemKey: (id) => REDIS_KEYS.walletConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredWalletConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      const { seed, skipReason } = extractFromWallet(stored);
      if (!seed) return { skipReason: skipReason ?? "could not derive prospect" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        prospectId: hashProspectKey(seed),
        configPayload: stored.config,
      };
    },
  },
  {
    kind: "trade",
    listKey: REDIS_KEYS.tradeConfigList,
    itemKey: (id) => REDIS_KEYS.tradeConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredTradeConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      // Trade stored theme lives inside `config` as an opaque
      // record; we don't have a prospect extractor for it. Fall back
      // to a minimal seed using `branding.logoUrl` + a hardcoded
      // neutral primary, since Trade rarely carried full themes.
      const theme = (stored.config as { theme?: unknown })?.theme;
      const branding = (stored.config as { branding?: { logoUrl?: string } })
        ?.branding;
      const fb = fallbackProspect(
        stored.ownerId,
        stored.name,
        stored.description ?? null,
        theme,
      );
      if (!fb.ok) return { skipReason: fb.skipReason };
      const seed: CreateProspectInput = {
        ...fb.seed,
        logoUrl: branding?.logoUrl ?? null,
      };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: seed,
        prospectId: hashProspectKey({
          ownerId: seed.ownerId,
          primaryColor: seed.primaryColor,
          logoUrl: seed.logoUrl ?? null,
        }),
        configPayload: stored.config,
      };
    },
  },
  {
    kind: "visa-direct",
    listKey: REDIS_KEYS.visaDirectConfigList,
    itemKey: (id) => REDIS_KEYS.visaDirectConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredVisaDirectConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      const fb = fallbackProspect(
        stored.ownerId,
        stored.name,
        stored.description ?? null,
        stored.config.theme,
      );
      if (!fb.ok) return { skipReason: fb.skipReason };
      const seed: CreateProspectInput = {
        ...fb.seed,
        logoUrl: stored.config.branding?.logoUrl ?? null,
      };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: seed,
        prospectId: hashProspectKey({
          ownerId: seed.ownerId,
          primaryColor: seed.primaryColor,
          logoUrl: seed.logoUrl ?? null,
        }),
        configPayload: stored.config,
      };
    },
  },
  {
    kind: "checkout",
    listKey: REDIS_KEYS.checkoutConfigList,
    itemKey: (id) => REDIS_KEYS.checkoutConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredCheckoutConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      const { seed, skipReason } = extractFromCheckout(stored);
      if (!seed) return { skipReason: skipReason ?? "could not derive prospect" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        prospectId: hashProspectKey(seed),
        configPayload: stored.config,
      };
    },
  },
  {
    kind: "remittance",
    listKey: REDIS_KEYS.remittanceConfigList,
    itemKey: (id) => REDIS_KEYS.remittanceConfig(id),
    resolve: (raw, id) => {
      if (!isObject(raw)) return { skipReason: "record missing" };
      const stored = raw as unknown as StoredRemittanceConfig;
      if (!stored.ownerId)
        return { skipReason: "missing ownerId — orphan legacy config" };
      const { seed, skipReason } = extractFromRemittance(stored);
      if (!seed) return { skipReason: skipReason ?? "could not derive prospect" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        prospectInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          secondaryColor: seed.secondaryColor ?? null,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        prospectId: hashProspectKey(seed),
        configPayload: stored.config,
      };
    },
  },
];

function emptyKindBucket() {
  return { created: 0, deduped: 0, skipped: 0, failed: 0 };
}

function initReport(): DemoConfigsBackfillReport {
  const byKind = {} as DemoConfigsBackfillReport["byKind"];
  for (const k of BACKFILL_KINDS) byKind[k] = emptyKindBucket();
  return {
    results: [],
    totals: { created: 0, deduped: 0, skipped: 0, failed: 0 },
    byKind,
  };
}

export async function runDemoConfigsBackfill(
  deps: DemoConfigsBackfillDeps,
): Promise<DemoConfigsBackfillReport> {
  const log = deps.log ?? (() => {});
  const wanted = new Set(deps.kinds ?? BACKFILL_KINDS);
  const report = initReport();

  for (const store of STORES) {
    if (!wanted.has(store.kind)) continue;
    log(`-- backfill kind=${store.kind} --`);
    const ids = await deps.redis.smembers(store.listKey);
    for (const id of ids) {
      const result = await processOne(store, id, deps);
      report.results.push(result);
      report.totals[result.outcome]++;
      report.byKind[store.kind][result.outcome]++;
      const tag = `${store.kind}:${id}`;
      if (result.outcome === "failed") log(`FAILED ${tag} — ${result.reason}`);
      else if (result.outcome === "skipped") log(`skip ${tag} — ${result.reason}`);
      else log(`${result.outcome} ${tag} (prospect ${result.prospectId})`);
    }
  }
  return report;
}

async function processOne(
  store: LegacyStore,
  id: string,
  deps: DemoConfigsBackfillDeps,
): Promise<DemoConfigsBackfillRecordResult> {
  const source = { id, kind: store.kind };
  const raw = await deps.redis.get(store.itemKey(id));
  if (raw === null) {
    return { source, outcome: "skipped", reason: "record missing for id in list" };
  }
  const resolved = store.resolve(raw, id);
  if ("skipReason" in resolved) {
    return { source, outcome: "skipped", reason: resolved.skipReason };
  }
  try {
    // Prospect: create only if missing. The canonical prospects are seeded by
    // backfill:prospects (which populates demoEarnId/demoCheckoutsId/etc.
    // from the ProspectProfile aggregate). Re-upserting here with a seed
    // derived from a single demo's embedded theme overwrites those
    // back-references with null and replaces the clean ProspectProfile name
    // with the demo's display name.
    let existingProspect = await deps.prospects.get(resolved.prospectId);
    if (!existingProspect) {
      existingProspect = await deps.prospects.upsertWithId(
        resolved.prospectId,
        resolved.prospectInput,
      );
    }
    const existing = await deps.demoConfigs.get(id);
    const input: CreateDemoConfigInput = {
      kind: store.kind,
      ownerId: resolved.ownerId,
      name: resolved.name,
      description: resolved.description,
      prospectId: resolved.prospectId,
      themeOverrides: null,
      config: resolved.configPayload,
    };
    const row = await deps.demoConfigs.upsertWithId(id, input);
    // Backfill the prospect's denormalized demoXxxId for this kind so the
    // dashboard UI's "Demos" count and demo-link slots populate. Only
    // touch the field if it's currently null — preserves any
    // ProspectProfile-derived value that backfill:prospects already set.
    // Trade and visa-direct have no Prospect back-reference column
    // (the prospect-edit page only surfaces 4 demo kinds today), so they
    // skip silently.
    const linkField = DEMO_KIND_TO_PROSPECT_FIELD[store.kind];
    if (linkField && existingProspect && existingProspect[linkField] === null) {
      const patch: UpdateProspectInput = { [linkField]: row.id };
      await deps.prospects.update(resolved.prospectId, patch);
    }
    return {
      source,
      outcome: existing ? "deduped" : "created",
      configId: row.id,
      prospectId: resolved.prospectId,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { source, outcome: "failed", reason };
  }
}
