"use server";

/**
 * Wallet Config Server Actions
 *
 * Server-side actions for Wallet config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Wallet configs store theme and branding settings for the Wallet demo app.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type { StoredWalletConfig, WalletConfig } from "@/lib/types/dashboard";
import { DEFAULT_WALLET_CONFIG } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new Wallet configuration
 */
export async function createWalletConfig(
  name: string,
  config?: Partial<WalletConfig>
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    // Merge provided config with defaults
    const mergedConfig: WalletConfig = {
      theme: { ...DEFAULT_WALLET_CONFIG.theme, ...config?.theme },
      branding: {
        ...DEFAULT_WALLET_CONFIG.branding,
        ...config?.branding,
        // Ensure required 'logo' field is always set
        logo: config?.branding?.logo ?? DEFAULT_WALLET_CONFIG.branding!.logo,
      },
    };

    const newConfig: StoredWalletConfig = {
      id,
      name: name || "Untitled Wallet Config",
      config: mergedConfig,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.walletConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.walletConfigList, id);

    revalidatePath("/");
    revalidatePath("/wallets");

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create Wallet config:", err);
    return { success: false, error: "Failed to create Wallet config" };
  }
}

/**
 * Get a Wallet configuration by ID
 */
export async function getWalletConfig(
  id: string
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredWalletConfig>(
      REDIS_KEYS.walletConfig(id)
    );

    if (!config) {
      return { success: false, error: "Wallet config not found" };
    }

    // Check ownership (allow orphaned configs)
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get Wallet config:", err);
    return { success: false, error: "Failed to get Wallet config" };
  }
}

/**
 * Update an existing Wallet configuration
 */
export async function updateWalletConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<WalletConfig>;
  }
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredWalletConfig>(
      REDIS_KEYS.walletConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Wallet config not found" };
    }

    // Check ownership (allow orphaned configs to be claimed)
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Merge config updates
    const mergedConfig: WalletConfig = {
      theme: { ...existing.config.theme, ...updates.config?.theme },
      branding: {
        ...existing.config.branding,
        ...updates.config?.branding,
        // Ensure required 'logo' field is always set
        logo:
          updates.config?.branding?.logo ??
          existing.config.branding?.logo ??
          DEFAULT_WALLET_CONFIG.branding!.logo,
      },
    };

    const updated: StoredWalletConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: mergedConfig,
      ownerId: existing.ownerId || user.sub, // Claim orphaned configs
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.walletConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/wallets");
    revalidatePath(`/wallets/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update Wallet config:", err);
    return { success: false, error: "Failed to update Wallet config" };
  }
}

/**
 * Delete a Wallet configuration
 */
export async function deleteWalletConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredWalletConfig>(
      REDIS_KEYS.walletConfig(id)
    );

    if (!config) {
      return { success: false, error: "Wallet config not found" };
    }

    // Check ownership
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.walletConfig(id));
    await redis.srem(REDIS_KEYS.walletConfigList, id);

    revalidatePath("/");
    revalidatePath("/wallets");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Wallet config:", err);
    return { success: false, error: "Failed to delete Wallet config" };
  }
}

/**
 * Fetches all Wallet configurations for the current user and orphaned configs
 *
 * @returns Object with user's configs and orphaned configs, sorted by updatedAt descending
 */
export async function getAllWalletConfigs(): Promise<{
  configs: StoredWalletConfig[];
  orphaned: StoredWalletConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const redis = getRedis();

  // Get all config IDs from the list
  const configIds = await redis.smembers(REDIS_KEYS.walletConfigList);

  if (!configIds || configIds.length === 0) {
    return { configs: [], orphaned: [] };
  }

  // Fetch all configs
  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredWalletConfig>(
        REDIS_KEYS.walletConfig(id)
      );
      return config;
    })
  );

  // Filter out nulls
  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredWalletConfig => c !== null
  );

  // Separate user's configs and orphaned configs
  const userConfigs = user
    ? validConfigs.filter((c) => c.ownerId === user.sub)
    : [];
  const orphanedConfigs = validConfigs.filter((c) => !c.ownerId);

  // Sort both lists by updatedAt descending
  const sortByUpdated = (a: StoredWalletConfig, b: StoredWalletConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

/**
 * Get a Wallet config by ID (public, for API routes)
 * Does not require authentication - used by consumer apps
 */
export async function getWalletConfigPublic(
  id: string
): Promise<StoredWalletConfig | null> {
  try {
    const redis = getRedis();
    const config = await redis.get<StoredWalletConfig>(
      REDIS_KEYS.walletConfig(id)
    );
    return config;
  } catch (err) {
    console.error("Failed to get Wallet config:", err);
    return null;
  }
}
