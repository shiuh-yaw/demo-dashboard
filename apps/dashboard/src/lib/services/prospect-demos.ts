/**
 * Resolves a prospect's per-kind demo map from `DemoConfig.prospectId` -
 * the single binding representation (GTM DemoConfig unified-binding expand
 * step). Replaces the legacy `Prospect.demoEarnId`/`demoCheckoutsId`/
 * `demoWalletId`/`demoRemittanceId` reverse-FK columns, which covered only
 * four kinds; this resolves every kind in `DEMO_CONFIG_KINDS`.
 *
 * Selection rule per kind: the `isPrimary` config wins; absent a primary,
 * the most recently updated config of that kind wins.
 *
 * Split into pure grouping/selection functions (`resolveDemoMap`,
 * `resolveDemoMapBatch`) and thin IO wrappers so the selection logic is
 * unit-testable without a database or a mocked service.
 */

import { services } from "@/lib/services";
import type { DemoConfigKind } from "./types";

export type ProspectDemoMap = Partial<Record<DemoConfigKind, string>>;

/** Minimal shape needed to pick the primary-or-latest config per kind. */
export interface PrimaryCandidate {
  id: string;
  kind: DemoConfigKind;
  prospectId: string | null;
  isPrimary: boolean;
  updatedAt: Date;
}

/** isPrimary wins; absent a primary, the most recently updated row wins. */
function pickPrimary(candidates: PrimaryCandidate[]): PrimaryCandidate {
  const primaries = candidates.filter((c) => c.isPrimary);
  const pool = primaries.length > 0 ? primaries : candidates;
  return pool.reduce((best, c) => (c.updatedAt > best.updatedAt ? c : best));
}

/** Pure: reduce a flat candidate list (one prospect) to one id per kind. */
export function resolveDemoMap(candidates: PrimaryCandidate[]): ProspectDemoMap {
  const byKind = new Map<DemoConfigKind, PrimaryCandidate[]>();
  for (const candidate of candidates) {
    const list = byKind.get(candidate.kind) ?? [];
    list.push(candidate);
    byKind.set(candidate.kind, list);
  }
  const demos: ProspectDemoMap = {};
  for (const [kind, list] of byKind) {
    demos[kind] = pickPrimary(list).id;
  }
  return demos;
}

/** Pure: reduce a flat candidate list (many prospects) to a demo map per prospectId. */
export function resolveDemoMapBatch(
  candidates: PrimaryCandidate[],
): Map<string, ProspectDemoMap> {
  const byProspect = new Map<string, PrimaryCandidate[]>();
  for (const candidate of candidates) {
    if (!candidate.prospectId) continue;
    const list = byProspect.get(candidate.prospectId) ?? [];
    list.push(candidate);
    byProspect.set(candidate.prospectId, list);
  }
  const result = new Map<string, ProspectDemoMap>();
  for (const [prospectId, list] of byProspect) {
    result.set(prospectId, resolveDemoMap(list));
  }
  return result;
}

/** IO: resolve one prospect's demo map straight from the service. */
export async function resolveProspectDemos(
  prospectId: string,
): Promise<ProspectDemoMap> {
  const candidates = await services.demoConfigs.listIdKinds({ prospectId });
  return resolveDemoMap(candidates);
}

/**
 * IO: batch-resolve many prospects' demo maps in one query - avoids an N+1
 * query per prospect on list pages (dashboard home, prospects list).
 */
export async function resolveProspectDemosBatch(
  prospectIds: string[],
): Promise<Map<string, ProspectDemoMap>> {
  if (prospectIds.length === 0) return new Map();
  const candidates = await services.demoConfigs.listIdKinds({
    prospectId: { in: prospectIds },
  });
  return resolveDemoMapBatch(candidates);
}
