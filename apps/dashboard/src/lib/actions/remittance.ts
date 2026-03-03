"use server";

/**
 * Remittance Config Server Actions
 *
 * Server-side actions for Remittance config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Remittance configs store theme and branding for the Remittance demo app.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  StoredRemittanceConfig,
  RemittanceConfig,
} from "@/lib/types/dashboard";
import { DEFAULT_REMITTANCE_CONFIG } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Remittance configuration
 */
export async function createRemittanceConfig(
  name: string,
  config?: Partial<RemittanceConfig>
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    const mergedConfig: RemittanceConfig = {
      theme: {
        ...DEFAULT_REMITTANCE_CONFIG.theme,
        ...config?.theme,
      },
      branding: {
        ...DEFAULT_REMITTANCE_CONFIG.branding,
        ...config?.branding,
      },
    };

    const newConfig: StoredRemittanceConfig = {
      id,
      name: name || "Untitled Remittance Config",
      config: mergedConfig,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.remittanceConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.remittanceConfigList, id);

    revalidatePath("/");
    revalidatePath("/remittance");

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create Remittance config:", err);
    return { success: false, error: "Failed to create Remittance config" };
  }
}

/**
 * Get a Remittance configuration by ID
 */
export async function getRemittanceConfig(
  id: string
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(id)
    );

    if (!config) {
      return { success: false, error: "Remittance config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get Remittance config:", err);
    return { success: false, error: "Failed to get Remittance config" };
  }
}

/**
 * Update an existing Remittance configuration
 */
export async function updateRemittanceConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<RemittanceConfig>;
  }
): Promise<ActionResult<StoredRemittanceConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Remittance config not found" };
    }

    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const mergedConfig: RemittanceConfig = {
      theme: { ...existing.config.theme, ...updates.config?.theme },
      branding: { ...existing.config.branding, ...updates.config?.branding },
    };

    const updated: StoredRemittanceConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: mergedConfig,
      ownerId: existing.ownerId || user.sub,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.remittanceConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/remittance");
    revalidatePath(`/remittance/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update Remittance config:", err);
    return { success: false, error: "Failed to update Remittance config" };
  }
}

/**
 * Delete a Remittance configuration
 */
export async function deleteRemittanceConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(id)
    );

    if (!config) {
      return { success: false, error: "Remittance config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.remittanceConfig(id));
    await redis.srem(REDIS_KEYS.remittanceConfigList, id);

    revalidatePath("/");
    revalidatePath("/remittance");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Remittance config:", err);
    return { success: false, error: "Failed to delete Remittance config" };
  }
}

/**
 * Fetches all Remittance configurations for the current user and orphaned configs
 */
export async function getAllRemittanceConfigs(): Promise<{
  configs: StoredRemittanceConfig[];
  orphaned: StoredRemittanceConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const redis = getRedis();
  const configIds = await redis.smembers(REDIS_KEYS.remittanceConfigList);

  if (!configIds || configIds.length === 0) {
    return { configs: [], orphaned: [] };
  }

  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredRemittanceConfig>(
        REDIS_KEYS.remittanceConfig(id)
      );
      return config;
    })
  );

  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredRemittanceConfig => c !== null
  );

  const userConfigs = validConfigs.filter((c) => c.ownerId === user.sub);
  const orphanedConfigs = validConfigs.filter((c) => !c.ownerId);

  const sortByUpdated = (
    a: StoredRemittanceConfig,
    b: StoredRemittanceConfig
  ) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

/**
 * Get a Remittance config by ID (public, for API routes)
 */
export async function getRemittanceConfigPublic(
  id: string
): Promise<StoredRemittanceConfig | null> {
  try {
    const redis = getRedis();
    const config = await redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(id)
    );
    return config;
  } catch (err) {
    console.error("Failed to get Remittance config:", err);
    return null;
  }
}
