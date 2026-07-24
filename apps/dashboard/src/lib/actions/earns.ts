"use server";

/**
 * Earn Config Server Actions
 *
 * Server-side actions for Earn config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` (unified `DemoConfig`
 * row, discriminated by `kind`) via the `earnMapper`. `prospectId` is
 * caller-supplied (GTM-03.5B) - the form passes it explicitly, `null` means
 * unbound. `services.demoConfigs` is Postgres-backed.
 */

import { revalidatePath } from "next/cache";
import {
  getSessionUser,
  canMutateDemoConfig,
  visibleProspectIds,
  isDemoConfigVisible,
  demoConfigActiveScopeWhere,
  resolveActiveScope,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { services } from "@/lib/services";
import { prospectsByIdFor } from "@/lib/actions/demo-config-prospects";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import { earnMapper } from "@/lib/services/demo-config-mappers/earn";
import type { EarnConfig, StoredEarnConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Earn configuration
 */
export async function createEarnConfig(
  name: string,
  config?: Partial<EarnConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredEarnConfig>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }
  try {
    const create = await earnMapper.toCreateInput(services.prospects, {
      ownerId: user.dynamicUserId ?? "",
      createdById: user.id,
      name: name && name.length > 0 ? name : null,
      description: null,
      prospectId,
      config: (await normalizeBrandingLogos(config ?? {})) as EarnConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = earnMapper.toStored(record, prospect);

    revalidatePath("/earns");

    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Earn config:", err);
    return { success: false, error: "Failed to create Earn config" };
  }
}

/**
 * Get an Earn configuration by ID
 */
export async function getEarnConfig(
  id: string
): Promise<ActionResult<StoredEarnConfig>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    const visible = await visibleProspectIds(user);
    if (!isDemoConfigVisible(user, visible, record)) {
      // Same not-found shape as a missing id - no existence oracle.
      return { success: false, error: "Earn config not found" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: earnMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Earn config:", err);
    return { success: false, error: "Failed to get Earn config" };
  }
}

/**
 * Update an existing Earn configuration
 */
export async function updateEarnConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<EarnConfig>;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredEarnConfig>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    if (!(await canMutateDemoConfig(user, existing))) {
      return { success: false, error: "Access denied" };
    }

    const update = await earnMapper.toUpdateInput(
      services.prospects,
      existing,
      {
        ownerId: existing.ownerId,
        name: updates.name,
        description: updates.description,
        prospectId: updates.prospectId,
        config: await normalizeBrandingLogos(updates.config),
      },
    );
    const updated = await services.demoConfigs.update(id, update);
    const prospect = updated.prospectId
      ? await services.prospects.get(updated.prospectId)
      : null;
    const stored = earnMapper.toStored(updated, prospect);

    revalidatePath("/earns");
    revalidatePath(`/earns/${id}`);

    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Earn config:", err);
    return { success: false, error: "Failed to update Earn config" };
  }
}

/**
 * Delete an Earn configuration
 */
export async function deleteEarnConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    if (!(await canMutateDemoConfig(user, record))) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);

    revalidatePath("/earns");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Earn config:", err);
    return { success: false, error: "Failed to delete Earn config" };
  }
}

/**
 * Fetches all Earn configurations for the current user and orphaned configs
 *
 * @returns Object with user's configs and orphaned configs, sorted by updatedAt descending
 */
export async function getAllEarnConfigs(): Promise<{
  configs: StoredEarnConfig[];
  orphaned: StoredEarnConfig[];
}> {
  const user = await getSessionUser();
  if (!user) return { configs: [], orphaned: [] };

  const scope = await resolveActiveScope(user);
  // Scoped + kind-filtered in the DB query, not a full-list JS filter.
  // Bounded join fetch (not a paginated list) - every earn config in the
  // active scope, capped at MAX_PAGE_LIMIT, same idiom as the prospect join
  // fetches elsewhere (demos-table.ts, org-scope.ts) - list sizes here are
  // small (per-owner index makes owner-scoped lists O(N owned)).
  const all = (
    await services.demoConfigs.list({
      where: demoConfigActiveScopeWhere(user, scope),
      kind: "earn",
      limit: MAX_PAGE_LIMIT,
    })
  ).items;
  const prospectsById = await prospectsByIdFor(all);
  const stored = all.map((record) =>
    earnMapper.toStored(
      record,
      record.prospectId ? prospectsById.get(record.prospectId) ?? null : null,
    ),
  );

  const userConfigs = stored.filter((c) => c.ownerId);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (a: StoredEarnConfig, b: StoredEarnConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

/**
 * Get an Earn config by ID (public, for API routes)
 * Does not require authentication - used by consumer apps
 */
export async function getEarnConfigPublic(
  id: string
): Promise<StoredEarnConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "earn") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return earnMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Earn config:", err);
    return null;
  }
}
