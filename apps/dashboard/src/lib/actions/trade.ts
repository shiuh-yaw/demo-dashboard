"use server";

/**
 * Trade Config Server Actions
 *
 * Server-side actions for Trade config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Trade configs store branding for the Trade demo app.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  StoredTradeConfig,
  TradeConfig,
} from "@/lib/types/dashboard";
import { DEFAULT_TRADE_CONFIG } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Trade configuration
 */
export async function createTradeConfig(
  name: string,
  config?: Partial<TradeConfig>
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    const mergedConfig: TradeConfig = {
      branding: {
        ...DEFAULT_TRADE_CONFIG.branding,
        ...config?.branding,
      },
    };

    const newConfig: StoredTradeConfig = {
      id,
      name: name || "Untitled Trade Config",
      config: mergedConfig,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.tradeConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.tradeConfigList, id);

    revalidatePath("/");
    revalidatePath("/trade");

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create Trade config:", err);
    return { success: false, error: "Failed to create Trade config" };
  }
}

/**
 * Get a Trade configuration by ID
 */
export async function getTradeConfig(
  id: string
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredTradeConfig>(
      REDIS_KEYS.tradeConfig(id)
    );

    if (!config) {
      return { success: false, error: "Trade config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get Trade config:", err);
    return { success: false, error: "Failed to get Trade config" };
  }
}

/**
 * Update an existing Trade configuration
 */
export async function updateTradeConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<TradeConfig>;
  }
): Promise<ActionResult<StoredTradeConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredTradeConfig>(
      REDIS_KEYS.tradeConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Trade config not found" };
    }

    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const mergedConfig: TradeConfig = {
      branding: { ...existing.config.branding, ...updates.config?.branding },
    };

    const updated: StoredTradeConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: mergedConfig,
      ownerId: existing.ownerId || user.sub,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.tradeConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/trade");
    revalidatePath(`/trade/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update Trade config:", err);
    return { success: false, error: "Failed to update Trade config" };
  }
}

/**
 * Delete a Trade configuration
 */
export async function deleteTradeConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredTradeConfig>(
      REDIS_KEYS.tradeConfig(id)
    );

    if (!config) {
      return { success: false, error: "Trade config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.tradeConfig(id));
    await redis.srem(REDIS_KEYS.tradeConfigList, id);

    revalidatePath("/");
    revalidatePath("/trade");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Trade config:", err);
    return { success: false, error: "Failed to delete Trade config" };
  }
}

/**
 * Fetches all Trade configurations for the current user and orphaned configs
 */
export async function getAllTradeConfigs(): Promise<{
  configs: StoredTradeConfig[];
  orphaned: StoredTradeConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const redis = getRedis();
  const configIds = await redis.smembers(REDIS_KEYS.tradeConfigList);

  if (!configIds || configIds.length === 0) {
    return { configs: [], orphaned: [] };
  }

  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredTradeConfig>(
        REDIS_KEYS.tradeConfig(id)
      );
      return config;
    })
  );

  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredTradeConfig => c !== null
  );

  const userConfigs = validConfigs.filter((c) => c.ownerId === user.sub);
  const orphanedConfigs = validConfigs.filter((c) => !c.ownerId);

  const sortByUpdated = (
    a: StoredTradeConfig,
    b: StoredTradeConfig
  ) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

/**
 * Get a Trade config by ID (public, for API routes)
 */
export async function getTradeConfigPublic(
  id: string
): Promise<StoredTradeConfig | null> {
  try {
    const redis = getRedis();
    const config = await redis.get<StoredTradeConfig>(
      REDIS_KEYS.tradeConfig(id)
    );
    return config;
  } catch (err) {
    console.error("Failed to get Trade config:", err);
    return null;
  }
}
