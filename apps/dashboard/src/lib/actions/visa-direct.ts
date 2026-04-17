"use server";

/**
 * Visa Direct Config Server Actions
 *
 * Server-side actions for Visa Direct config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Visa Direct configs store branding + theme for the Visa Direct demo app.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  StoredVisaDirectConfig,
  VisaDirectConfig,
} from "@/lib/types/dashboard";
import { DEFAULT_VISA_DIRECT_CONFIG } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Visa Direct configuration
 */
export async function createVisaDirectConfig(
  name: string,
  config?: Partial<VisaDirectConfig>
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    const mergedConfig: VisaDirectConfig = {
      branding: {
        ...DEFAULT_VISA_DIRECT_CONFIG.branding,
        ...config?.branding,
      },
      theme: {
        ...DEFAULT_VISA_DIRECT_CONFIG.theme,
        ...config?.theme,
      },
    };

    const newConfig: StoredVisaDirectConfig = {
      id,
      name: name || "Untitled Visa Direct Config",
      config: mergedConfig,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.visaDirectConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.visaDirectConfigList, id);

    revalidatePath("/");
    revalidatePath("/visa-direct");

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create Visa Direct config:", err);
    return { success: false, error: "Failed to create Visa Direct config" };
  }
}

/**
 * Get a Visa Direct configuration by ID (owner-scoped)
 */
export async function getVisaDirectConfig(
  id: string
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredVisaDirectConfig>(
      REDIS_KEYS.visaDirectConfig(id)
    );

    if (!config) {
      return { success: false, error: "Visa Direct config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get Visa Direct config:", err);
    return { success: false, error: "Failed to get Visa Direct config" };
  }
}

/**
 * Update an existing Visa Direct configuration
 */
export async function updateVisaDirectConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<VisaDirectConfig>;
  }
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredVisaDirectConfig>(
      REDIS_KEYS.visaDirectConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Visa Direct config not found" };
    }

    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const mergedConfig: VisaDirectConfig = {
      branding: {
        ...existing.config.branding,
        ...updates.config?.branding,
      },
      theme: {
        ...existing.config.theme,
        ...updates.config?.theme,
      },
    };

    const updated: StoredVisaDirectConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: mergedConfig,
      ownerId: existing.ownerId || user.sub,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.visaDirectConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/visa-direct");
    revalidatePath(`/visa-direct/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update Visa Direct config:", err);
    return { success: false, error: "Failed to update Visa Direct config" };
  }
}

/**
 * Delete a Visa Direct configuration
 */
export async function deleteVisaDirectConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredVisaDirectConfig>(
      REDIS_KEYS.visaDirectConfig(id)
    );

    if (!config) {
      return { success: false, error: "Visa Direct config not found" };
    }

    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.visaDirectConfig(id));
    await redis.srem(REDIS_KEYS.visaDirectConfigList, id);

    revalidatePath("/");
    revalidatePath("/visa-direct");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Visa Direct config:", err);
    return { success: false, error: "Failed to delete Visa Direct config" };
  }
}

/**
 * Fetch all Visa Direct configs for the current user and orphaned configs
 */
export async function getAllVisaDirectConfigs(): Promise<{
  configs: StoredVisaDirectConfig[];
  orphaned: StoredVisaDirectConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const redis = getRedis();
  const configIds = await redis.smembers(REDIS_KEYS.visaDirectConfigList);

  if (!configIds || configIds.length === 0) {
    return { configs: [], orphaned: [] };
  }

  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredVisaDirectConfig>(
        REDIS_KEYS.visaDirectConfig(id)
      );
      return config;
    })
  );

  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredVisaDirectConfig => c !== null
  );

  const userConfigs = validConfigs.filter((c) => c.ownerId === user.sub);
  const orphanedConfigs = validConfigs.filter((c) => !c.ownerId);

  const sortByUpdated = (
    a: StoredVisaDirectConfig,
    b: StoredVisaDirectConfig
  ) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

/**
 * Get a Visa Direct config by ID (public, for API routes — no auth)
 */
export async function getVisaDirectConfigPublic(
  id: string
): Promise<StoredVisaDirectConfig | null> {
  try {
    const redis = getRedis();
    const config = await redis.get<StoredVisaDirectConfig>(
      REDIS_KEYS.visaDirectConfig(id)
    );
    return config;
  } catch (err) {
    console.error("Failed to get Visa Direct config:", err);
    return null;
  }
}
