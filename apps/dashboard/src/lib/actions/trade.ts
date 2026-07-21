"use server";

/**
 * Trade Config Server Actions
 *
 * Server-side actions for Trade config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` via `tradeMapper`. See
 * `lib/actions/earns.ts` for the pattern.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { services } from "@/lib/services";
import { tradeMapper } from "@/lib/services/demo-config-mappers/trade";
import type { StoredTradeConfig, TradeConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createTradeConfig(
  name: string,
  config?: Partial<TradeConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const createdById =
      (await services.users.resolveByDynamicIds([user.sub])).get(user.sub)?.id ??
      null;
    const create = await tradeMapper.toCreateInput(services.prospects, {
      ownerId: user.sub,
      createdById,
      name: name && name.length > 0 ? name : null,
      description: null,
      prospectId,
      config: (await normalizeBrandingLogos(config ?? {})) as TradeConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = tradeMapper.toStored(record, prospect);
    revalidatePath("/");
    revalidatePath("/trade");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Trade config:", err);
    return { success: false, error: "Failed to create Trade config" };
  }
}

export async function getTradeConfig(
  id: string
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "trade") {
      return { success: false, error: "Trade config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: tradeMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Trade config:", err);
    return { success: false, error: "Failed to get Trade config" };
  }
}

export async function updateTradeConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<TradeConfig>;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "trade") {
      return { success: false, error: "Trade config not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const update = await tradeMapper.toUpdateInput(
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
    const stored = tradeMapper.toStored(updated, prospect);
    revalidatePath("/");
    revalidatePath("/trade");
    revalidatePath(`/trade/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Trade config:", err);
    return { success: false, error: "Failed to update Trade config" };
  }
}

export async function deleteTradeConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "trade") {
      return { success: false, error: "Trade config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/");
    revalidatePath("/trade");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Trade config:", err);
    return { success: false, error: "Failed to delete Trade config" };
  }
}

export async function getAllTradeConfigs(): Promise<{
  configs: StoredTradeConfig[];
  orphaned: StoredTradeConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };
  const all = await services.demoConfigs.list({ kind: "trade" });
  const stored = await Promise.all(
    all.map(async (record) => {
      const prospect = record.prospectId
        ? await services.prospects.get(record.prospectId)
        : null;
      return tradeMapper.toStored(record, prospect);
    }),
  );
  const userConfigs = stored.filter((c) => c.ownerId === user.sub);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (a: StoredTradeConfig, b: StoredTradeConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

export async function getTradeConfigPublic(
  id: string
): Promise<StoredTradeConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "trade") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return tradeMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Trade config:", err);
    return null;
  }
}
