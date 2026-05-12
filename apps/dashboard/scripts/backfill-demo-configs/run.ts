/**
 * Phase 2 unified-DemoConfig backfill orchestrator.
 *
 * Walks each legacy per-type Redis keyspace and upserts both the
 * Brand row (via `hashBrandKey` — same derivation as the brand
 * backfill so theme rules stay in lockstep) and the matching
 * `DemoConfig` row with the **legacy id preserved** (Q-014). Re-running
 * is idempotent: deterministic Brand id + caller-supplied DemoConfig
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
  CreateBrandInput,
  CreateDemoConfigInput,
  UpdateBrandInput,
} from "@/lib/services/types";

import {
  extractFromCheckout,
  extractFromEarn,
  extractFromRemittance,
  extractFromWallet,
} from "../backfill-brands/extractors";
import { hashBrandKey } from "../backfill-brands/hash";
import type {
  BackfillDemoKind,
  DemoConfigsBackfillDeps,
  DemoConfigsBackfillRecordResult,
  DemoConfigsBackfillReport,
} from "./types";
import { BACKFILL_KINDS } from "./types";

/**
 * Maps the unified DemoConfig `kind` to the corresponding denormalized
 * back-reference column on `Brand`. The brand-edit page surfaces four
 * demo kinds today (earn/checkout/wallet/remittance); trade and
 * visa-direct have no column and intentionally fall outside this map
 * (the link step is a no-op for them).
 */
const DEMO_KIND_TO_BRAND_FIELD: Partial<
  Record<BackfillDemoKind, keyof Pick<UpdateBrandInput, "demoEarnId" | "demoCheckoutsId" | "demoWalletId" | "demoRemittanceId">>
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
 * Trade and Visa Direct have no brand-extractor helper today (the
 * brand backfill never crawled them — they were rarely themed). We
 * derive a brand seed inline from the embedded theme; same hex rules
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
  brandInput: CreateBrandInput;
  brandId: string;
  /** Demo-specific payload — everything except the embedded theme. */
  configPayload: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Inline brand-seed derivation for stores the brand backfill never
 * walked. Mirrors `extractors.ts` for the primaryColor-only path.
 */
type FallbackResult =
  | { ok: true; seed: CreateBrandInput }
  | { ok: false; skipReason: string };

function fallbackBrand(
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
      if (!seed) return { skipReason: skipReason ?? "could not derive brand" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        brandId: hashBrandKey(seed),
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
      if (!seed) return { skipReason: skipReason ?? "could not derive brand" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        brandId: hashBrandKey(seed),
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
      // record; we don't have a brand extractor for it. Fall back
      // to a minimal seed using `branding.logoUrl` + a hardcoded
      // neutral primary, since Trade rarely carried full themes.
      const theme = (stored.config as { theme?: unknown })?.theme;
      const branding = (stored.config as { branding?: { logoUrl?: string } })
        ?.branding;
      const fb = fallbackBrand(
        stored.ownerId,
        stored.name,
        stored.description ?? null,
        theme,
      );
      if (!fb.ok) return { skipReason: fb.skipReason };
      const seed: CreateBrandInput = {
        ...fb.seed,
        logoUrl: branding?.logoUrl ?? null,
      };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: seed,
        brandId: hashBrandKey({
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
      const fb = fallbackBrand(
        stored.ownerId,
        stored.name,
        stored.description ?? null,
        stored.config.theme,
      );
      if (!fb.ok) return { skipReason: fb.skipReason };
      const seed: CreateBrandInput = {
        ...fb.seed,
        logoUrl: stored.config.branding?.logoUrl ?? null,
      };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: seed,
        brandId: hashBrandKey({
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
      if (!seed) return { skipReason: skipReason ?? "could not derive brand" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        brandId: hashBrandKey(seed),
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
      if (!seed) return { skipReason: skipReason ?? "could not derive brand" };
      return {
        ownerId: stored.ownerId,
        name: stored.name,
        description: stored.description ?? null,
        brandInput: {
          ownerId: seed.ownerId,
          name: seed.name,
          description: seed.description ?? null,
          primaryColor: seed.primaryColor,
          secondaryColor: seed.secondaryColor ?? null,
          accentColor: seed.accentColor ?? null,
          logoUrl: seed.logoUrl ?? null,
        },
        brandId: hashBrandKey(seed),
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
      else log(`${result.outcome} ${tag} (brand ${result.brandId})`);
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
    // Brand: create only if missing. The canonical brands are seeded by
    // backfill:brands (which populates demoEarnId/demoCheckoutsId/etc.
    // from the BrandProfile aggregate). Re-upserting here with a seed
    // derived from a single demo's embedded theme overwrites those
    // back-references with null and replaces the clean BrandProfile name
    // with the demo's display name.
    let existingBrand = await deps.brands.get(resolved.brandId);
    if (!existingBrand) {
      existingBrand = await deps.brands.upsertWithId(
        resolved.brandId,
        resolved.brandInput,
      );
    }
    const existing = await deps.demoConfigs.get(id);
    const input: CreateDemoConfigInput = {
      kind: store.kind,
      ownerId: resolved.ownerId,
      name: resolved.name,
      description: resolved.description,
      brandId: resolved.brandId,
      themeOverrides: null,
      config: resolved.configPayload,
    };
    const row = await deps.demoConfigs.upsertWithId(id, input);
    // Backfill the brand's denormalized demoXxxId for this kind so the
    // dashboard UI's "Demos" count and demo-link slots populate. Only
    // touch the field if it's currently null — preserves any
    // BrandProfile-derived value that backfill:brands already set.
    // Trade and visa-direct have no Brand back-reference column
    // (the brand-edit page only surfaces 4 demo kinds today), so they
    // skip silently.
    const linkField = DEMO_KIND_TO_BRAND_FIELD[store.kind];
    if (linkField && existingBrand && existingBrand[linkField] === null) {
      const patch: UpdateBrandInput = { [linkField]: row.id };
      await deps.brands.update(resolved.brandId, patch);
    }
    return {
      source,
      outcome: existing ? "deduped" : "created",
      configId: row.id,
      brandId: resolved.brandId,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { source, outcome: "failed", reason };
  }
}
