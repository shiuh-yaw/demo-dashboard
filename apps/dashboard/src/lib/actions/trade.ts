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
import { services } from "@/lib/services";
import { tradeMapper } from "@/lib/services/demo-config-mappers/trade";
import type { StoredTradeConfig, TradeConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createTradeConfig(
  name: string,
  config?: Partial<TradeConfig>
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const create = await tradeMapper.toCreateInput(services.brands, {
      ownerId: user.sub,
      name: name && name.length > 0 ? name : null,
      description: null,
      config: (config ?? {}) as TradeConfig,
    });
    const record = await services.demoConfigs.create(create);
    const brand = await services.brands.get(record.brandId);
    const stored = tradeMapper.toStored(record, brand);
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
    const brand = record.brandId
      ? await services.brands.get(record.brandId)
      : null;
    return { success: true, data: tradeMapper.toStored(record, brand) };
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
      services.brands,
      existing,
      {
        ownerId: existing.ownerId || user.sub,
        name: updates.name,
        description: updates.description,
        config: updates.config,
      },
    );
    const updated = await services.demoConfigs.update(id, update);
    const brand = await services.brands.get(updated.brandId);
    const stored = tradeMapper.toStored(updated, brand);
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
      const brand = record.brandId
        ? await services.brands.get(record.brandId)
        : null;
      return tradeMapper.toStored(record, brand);
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
    const brand = record.brandId
      ? await services.brands.get(record.brandId)
      : null;
    return tradeMapper.toStored(record, brand);
  } catch (err) {
    console.error("Failed to get Trade config:", err);
    return null;
  }
}
