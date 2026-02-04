"use server";

/**
 * Earn Config Server Actions
 *
 * Server-side actions for Earn config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Earn configs store theme and branding settings for the Earn demo app.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type { StoredEarnConfig, EarnConfig } from "@/lib/types/dashboard";
import { DEFAULT_EARN_CONFIG } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Earn configuration
 */
export async function createEarnConfig(
  name: string,
  config?: Partial<EarnConfig>
): Promise<ActionResult<StoredEarnConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    // Merge provided config with defaults
    const mergedConfig: EarnConfig = {
      theme: { ...DEFAULT_EARN_CONFIG.theme, ...config?.theme },
      branding: {
        ...DEFAULT_EARN_CONFIG.branding,
        ...config?.branding,
        // Ensure required 'logo' field is always set (nullish coalescing handles undefined from spread)
        logo: config?.branding?.logo ?? DEFAULT_EARN_CONFIG.branding!.logo,
      },
      layout: { ...DEFAULT_EARN_CONFIG.layout, ...config?.layout },
    };

    const newConfig: StoredEarnConfig = {
      id,
      name: name || "Untitled Earn Config",
      config: mergedConfig,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.earnConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.earnConfigList, id);

    revalidatePath("/");
    revalidatePath("/earns");

    return { success: true, data: newConfig };
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
    const redis = getRedis();
    const config = await redis.get<StoredEarnConfig>(REDIS_KEYS.earnConfig(id));

    if (!config) {
      return { success: false, error: "Earn config not found" };
    }

    // Check ownership (allow orphaned configs)
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
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
  }
): Promise<ActionResult<StoredEarnConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredEarnConfig>(
      REDIS_KEYS.earnConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Earn config not found" };
    }

    // Check ownership (allow orphaned configs to be claimed)
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Merge config updates
    const mergedConfig: EarnConfig = {
      theme: { ...existing.config.theme, ...updates.config?.theme },
      branding: {
        ...existing.config.branding,
        ...updates.config?.branding,
        // Ensure required 'logo' field is always set
        logo:
          updates.config?.branding?.logo ??
          existing.config.branding?.logo ??
          DEFAULT_EARN_CONFIG.branding!.logo,
      },
      layout: { ...existing.config.layout, ...updates.config?.layout },
    };

    const updated: StoredEarnConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: mergedConfig,
      ownerId: existing.ownerId || user.sub, // Claim orphaned configs
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.earnConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/earns");
    revalidatePath(`/earns/${id}`);

    return { success: true, data: updated };
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
    const redis = getRedis();
    const config = await redis.get<StoredEarnConfig>(REDIS_KEYS.earnConfig(id));

    if (!config) {
      return { success: false, error: "Earn config not found" };
    }

    // Check ownership
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.earnConfig(id));
    await redis.srem(REDIS_KEYS.earnConfigList, id);

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

  const redis = getRedis();

  // Get all config IDs from the list
  const configIds = await redis.smembers(REDIS_KEYS.earnConfigList);

  if (!configIds || configIds.length === 0) {
    return { configs: [], orphaned: [] };
  }

  // Fetch all configs
  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredEarnConfig>(
        REDIS_KEYS.earnConfig(id)
      );
      return config;
    })
  );

  // Filter out nulls
  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredEarnConfig => c !== null
  );

  // Separate user's configs and orphaned configs
  const userConfigs = user
    ? validConfigs.filter((c) => c.ownerId === user.sub)
    : [];
  const orphanedConfigs = validConfigs.filter((c) => !c.ownerId);

  // Sort both lists by updatedAt descending
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
    const redis = getRedis();
    const config = await redis.get<StoredEarnConfig>(REDIS_KEYS.earnConfig(id));
    return config;
  } catch (err) {
    console.error("Failed to get Earn config:", err);
    return null;
  }
}
