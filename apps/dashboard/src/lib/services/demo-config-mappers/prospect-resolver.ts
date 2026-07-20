/**
 * Deterministic Prospect resolver shared by every per-kind demo-config
 * mapper.
 *
 * Hashes `(ownerId, normalised primaryColor, logoUrl)` through the same
 * derivation used by `scripts/backfill-prospects/hash.ts` (TD-002 spec)
 * so that:
 *
 *   - Action-created and backfill-created demos collapse onto the same
 *     `Prospect` row.
 *   - Re-running the backfill after action-layer writes is idempotent.
 *   - "Two demos with the same look" share one Prospect by construction
 *     instead of relying on operators to deduplicate.
 *
 * Re-imports `hashProspectKey` directly from the backfill module — single
 * source of truth, no copy-pasted hashing logic.
 */

import { hashProspectKey } from "../../../../scripts/backfill-prospects/hash";

import type { Prospect, ProspectService, CreateProspectInput } from "../types";

/**
 * The minimum theme-derived seed needed to resolve a Prospect. Mappers
 * supply this from the inbound `StoredXConfig`. Optional
 * `extraProspectFields` lets a kind enrich the upserted row with
 * accentColor / borderRadius / etc. without changing the hash key.
 */
export interface ProspectResolveInput {
  ownerId: string;
  /**
   * Human label used as the Prospect's `name` when the row is newly upserted.
   * Existing rows preserve their stored name — re-resolves are read-mostly.
   */
  name: string;
  /** Required hex. Normalised to lowercase before hashing. */
  primaryColor: string;
  /** Optional logo URL — part of the hash key per the backfill contract. */
  logoUrl: string | null;
  /** Optional extra fields persisted on the upserted Prospect (not hashed). */
  extra?: Partial<CreateProspectInput>;
}

/**
 * Resolve `(ownerId, primaryColor, logoUrl)` onto a deterministic Prospect
 * row. If the row exists, it is left as-is on the visual-theme columns
 * (the hash key is the source of truth there). Newly-created rows
 * carry the supplied `extra` fields so callers can enrich prospect
 * metadata at action-write time.
 *
 * Returns the resolved Prospect. Callers store its `id` on
 * `DemoConfig.prospectId`.
 */
export async function resolveProspect(
  prospects: ProspectService,
  input: ProspectResolveInput,
): Promise<Prospect> {
  const id = hashProspectKey({
    ownerId: input.ownerId,
    primaryColor: input.primaryColor,
    logoUrl: input.logoUrl,
  });
  // Read first — if the row exists, we don't touch it. This keeps
  // `createdAt` stable across re-resolves and avoids overwriting fields
  // a different demo-kind might have populated.
  const existing = await prospects.get(id);
  if (existing) return existing;

  // No existing row → upsert one with the inbound seed + any extras.
  // `upsertWithId` is idempotent against concurrent writers (it always
  // overwrites by id), so racing resolves converge.
  return prospects.upsertWithId(id, {
    ownerId: input.ownerId,
    name: input.name,
    primaryColor: input.primaryColor.toLowerCase(),
    logoUrl: input.logoUrl ?? null,
    logo: input.logoUrl ? "custom" : "dynamic",
    ...input.extra,
  });
}
