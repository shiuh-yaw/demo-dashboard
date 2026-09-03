"use server";

/**
 * Rimau Config Server Actions
 *
 * Server-side actions for Rimau config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` via `rimauMapper`. See
 * `lib/actions/earns.ts` for the pattern.
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
import { rimauMapper } from "@/lib/services/demo-config-mappers/rimau";
import type { StoredRimauConfig, RimauConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createRimauConfig(
  name: string,
  config?: Partial<RimauConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredRimauConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }
  try {
    const create = await rimauMapper.toCreateInput(services.prospects, {
      ownerId: user.dynamicUserId ?? "",
      createdById: user.id,
      name: name && name.length > 0 ? name : null,
      description: null,
      prospectId,
      config: (await normalizeBrandingLogos(config ?? {})) as RimauConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = rimauMapper.toStored(record, prospect);
    revalidatePath("/rimau");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Rimau config:", err);
    return { success: false, error: "Failed to create Rimau config" };
  }
}

export async function getRimauConfig(
  id: string
): Promise<ActionResult<StoredRimauConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "rimau") {
      return { success: false, error: "Rimau config not found" };
    }
    const visible = await visibleProspectIds(user);
    if (!isDemoConfigVisible(user, visible, record)) {
      // Same not-found shape as a missing id - no existence oracle.
      return { success: false, error: "Rimau config not found" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: rimauMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Rimau config:", err);
    return { success: false, error: "Failed to get Rimau config" };
  }
}

export async function updateRimauConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<RimauConfig>;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredRimauConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "rimau") {
      return { success: false, error: "Rimau config not found" };
    }
    if (!(await canMutateDemoConfig(user, existing))) {
      return { success: false, error: "Access denied" };
    }
    const update = await rimauMapper.toUpdateInput(
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
    const stored = rimauMapper.toStored(updated, prospect);
    revalidatePath("/rimau");
    revalidatePath(`/rimau/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Rimau config:", err);
    return { success: false, error: "Failed to update Rimau config" };
  }
}

export async function deleteRimauConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "rimau") {
      return { success: false, error: "Rimau config not found" };
    }
    if (!(await canMutateDemoConfig(user, record))) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/rimau");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Rimau config:", err);
    return { success: false, error: "Failed to delete Rimau config" };
  }
}

export async function getAllRimauConfigs(): Promise<{
  configs: StoredRimauConfig[];
  orphaned: StoredRimauConfig[];
}> {
  const user = await getSessionUser();
  if (!user) return { configs: [], orphaned: [] };
  const scope = await resolveActiveScope(user);
  // Scoped + kind-filtered in the DB query, not a full-list JS filter.
  // Bounded join fetch (not a paginated list) - same idiom as earns.ts.
  const all = (
    await services.demoConfigs.list({
      where: demoConfigActiveScopeWhere(user, scope),
      kind: "rimau",
      limit: MAX_PAGE_LIMIT,
    })
  ).items;
  const prospectsById = await prospectsByIdFor(all);
  const stored = all.map((record) =>
    rimauMapper.toStored(
      record,
      record.prospectId ? prospectsById.get(record.prospectId) ?? null : null,
    ),
  );
  const userConfigs = stored.filter((c) => c.ownerId);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (a: StoredRimauConfig, b: StoredRimauConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

export async function getRimauConfigPublic(
  id: string
): Promise<StoredRimauConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "rimau") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return rimauMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Rimau config:", err);
    return null;
  }
}
