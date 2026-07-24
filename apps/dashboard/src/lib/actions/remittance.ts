"use server";

/**
 * Remittance Config Server Actions
 *
 * Server-side actions for Remittance config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` via `remittanceMapper`.
 * See `lib/actions/earns.ts` for the pattern.
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
import { remittanceMapper } from "@/lib/services/demo-config-mappers/remittance";
import type {
  RemittanceConfig,
  StoredRemittanceConfig,
} from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createRemittanceConfig(
  name: string,
  config?: Partial<RemittanceConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }
  try {
    const create = await remittanceMapper.toCreateInput(services.prospects, {
      ownerId: user.dynamicUserId ?? "",
      createdById: user.id,
      name: name && name.length > 0 ? name : null,
      description: null,
      prospectId,
      config: (await normalizeBrandingLogos(config ?? {})) as RemittanceConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = remittanceMapper.toStored(record, prospect);
    revalidatePath("/remittance");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Remittance config:", err);
    return { success: false, error: "Failed to create Remittance config" };
  }
}

export async function getRemittanceConfig(
  id: string
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "remittance") {
      return { success: false, error: "Remittance config not found" };
    }
    const visible = await visibleProspectIds(user);
    if (!isDemoConfigVisible(user, visible, record)) {
      // Same not-found shape as a missing id - no existence oracle.
      return { success: false, error: "Remittance config not found" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: remittanceMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Remittance config:", err);
    return { success: false, error: "Failed to get Remittance config" };
  }
}

export async function updateRemittanceConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<RemittanceConfig>;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "remittance") {
      return { success: false, error: "Remittance config not found" };
    }
    if (!(await canMutateDemoConfig(user, existing))) {
      return { success: false, error: "Access denied" };
    }
    const update = await remittanceMapper.toUpdateInput(
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
    const stored = remittanceMapper.toStored(updated, prospect);
    revalidatePath("/remittance");
    revalidatePath(`/remittance/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Remittance config:", err);
    return { success: false, error: "Failed to update Remittance config" };
  }
}

export async function deleteRemittanceConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "remittance") {
      return { success: false, error: "Remittance config not found" };
    }
    if (!(await canMutateDemoConfig(user, record))) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/remittance");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Remittance config:", err);
    return { success: false, error: "Failed to delete Remittance config" };
  }
}

export async function getAllRemittanceConfigs(): Promise<{
  configs: StoredRemittanceConfig[];
  orphaned: StoredRemittanceConfig[];
}> {
  const user = await getSessionUser();
  if (!user) return { configs: [], orphaned: [] };
  const scope = await resolveActiveScope(user);
  // Scoped + kind-filtered in the DB query, not a full-list JS filter.
  // Bounded join fetch (not a paginated list) - same idiom as earns.ts.
  const all = (
    await services.demoConfigs.list({
      where: demoConfigActiveScopeWhere(user, scope),
      kind: "remittance",
      limit: MAX_PAGE_LIMIT,
    })
  ).items;
  const prospectsById = await prospectsByIdFor(all);
  const stored = all.map((record) =>
    remittanceMapper.toStored(
      record,
      record.prospectId ? prospectsById.get(record.prospectId) ?? null : null,
    ),
  );
  const userConfigs = stored.filter((c) => c.ownerId);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (
    a: StoredRemittanceConfig,
    b: StoredRemittanceConfig,
  ) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

export async function getRemittanceConfigPublic(
  id: string
): Promise<StoredRemittanceConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "remittance") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return remittanceMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Remittance config:", err);
    return null;
  }
}
