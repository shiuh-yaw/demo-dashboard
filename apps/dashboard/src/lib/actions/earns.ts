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
 * unbound. The Redis backend stays canonical until ops flips
 * `USE_POSTGRES_DEMO_CONFIGS=true`; the legacy per-kind Redis keyspace
 * is still readable via the service's read-fallback path.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { services } from "@/lib/services";
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const createdById =
      (await services.users.resolveByDynamicIds([user.sub])).get(user.sub)?.id ??
      null;
    const create = await earnMapper.toCreateInput(services.prospects, {
      ownerId: user.sub,
      createdById,
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

    revalidatePath("/");
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const update = await earnMapper.toUpdateInput(
      services.prospects,
      existing,
      {
        ownerId: existing.ownerId || user.sub,
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

    revalidatePath("/");
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
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "earn") {
      return { success: false, error: "Earn config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);

    revalidatePath("/");
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
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const all = await services.demoConfigs.list({ kind: "earn" });
  // Hydrate each row's Prospect. List sizes are small (per-owner index makes
  // owner-scoped lists O(N owned)) so a per-row prospect lookup is fine.
  const stored = await Promise.all(
    all.map(async (record) => {
      const prospect = record.prospectId
        ? await services.prospects.get(record.prospectId)
        : null;
      return earnMapper.toStored(record, prospect);
    }),
  );

  const userConfigs = stored.filter((c) => c.ownerId === user.sub);
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
