"use server";

/**
 * Checkout Server Actions
 *
 * Server-side actions for checkout CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Note: "Checkout" is the unified term for deposit/payment widgets.
 * Uses "payment-widget" Redis keys for backwards compatibility.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type { StoredCheckoutConfig, CheckoutMode } from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from "@/lib/widget-config";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new checkout configuration
 */
export async function createCheckout(
  name: string,
  mode?: CheckoutMode,
  config?: Partial<WidgetConfig>
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    const newConfig: StoredCheckoutConfig = {
      id,
      name: name || "Untitled Checkout",
      mode: mode || "payment",
      config: { ...DEFAULT_WIDGET_CONFIG, ...config },
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.checkoutConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.checkoutConfigList, id);

    revalidatePath("/");
    revalidatePath("/checkouts");

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create checkout:", err);
    return { success: false, error: "Failed to create checkout" };
  }
}

/**
 * Get a checkout configuration by ID
 */
export async function getCheckout(
  id: string
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredCheckoutConfig>(
      REDIS_KEYS.checkoutConfig(id)
    );

    if (!config) {
      return { success: false, error: "Checkout not found" };
    }

    // Check ownership (allow orphaned checkouts)
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get checkout:", err);
    return { success: false, error: "Failed to get checkout" };
  }
}

/**
 * Update an existing checkout configuration
 */
export async function updateCheckout(
  id: string,
  updates: {
    name?: string;
    description?: string;
    mode?: CheckoutMode;
    config?: WidgetConfig;
  }
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredCheckoutConfig>(
      REDIS_KEYS.checkoutConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Checkout not found" };
    }

    // Check ownership (allow orphaned checkouts to be claimed)
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const updated: StoredCheckoutConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      mode: updates.mode ?? existing.mode,
      config: updates.config ?? existing.config,
      ownerId: existing.ownerId || user.sub, // Claim orphaned checkouts
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.checkoutConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/checkouts");
    revalidatePath(`/checkouts/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update checkout:", err);
    return { success: false, error: "Failed to update checkout" };
  }
}

/**
 * Delete a checkout configuration
 */
export async function deleteCheckout(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredCheckoutConfig>(
      REDIS_KEYS.checkoutConfig(id)
    );

    if (!config) {
      return { success: false, error: "Checkout not found" };
    }

    // Check ownership
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.checkoutConfig(id));
    await redis.srem(REDIS_KEYS.checkoutConfigList, id);

    revalidatePath("/");
    revalidatePath("/checkouts");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete checkout:", err);
    return { success: false, error: "Failed to delete checkout" };
  }
}

/**
 * Fetches checkout configurations for the current user and orphaned checkouts
 *
 * @returns Object with user's checkouts and orphaned checkouts, sorted by updatedAt descending
 * @throws Error if Redis operation fails or times out
 */
export async function getAllCheckoutConfigs(): Promise<{
  checkouts: StoredCheckoutConfig[];
  orphaned: StoredCheckoutConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { checkouts: [], orphaned: [] };

  const redis = getRedis();

  // Get all config IDs from the list
  const configIds = await redis.smembers(REDIS_KEYS.checkoutConfigList);

  if (!configIds || configIds.length === 0) {
    return { checkouts: [], orphaned: [] };
  }

  // Fetch all configs
  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredCheckoutConfig>(
        REDIS_KEYS.checkoutConfig(id)
      );
      return config;
    })
  );

  // Filter out nulls
  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredCheckoutConfig => c !== null
  );

  // Separate user's checkouts and orphaned checkouts
  const userCheckouts = user
    ? validConfigs.filter((c) => c.ownerId === user.sub)
    : [];
  const orphanedCheckouts = validConfigs.filter((c) => !c.ownerId);

  // Sort both lists by updatedAt descending
  const sortByUpdated = (a: StoredCheckoutConfig, b: StoredCheckoutConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    checkouts: userCheckouts.sort(sortByUpdated),
    orphaned: orphanedCheckouts.sort(sortByUpdated),
  };
}

/**
 * Fetches a single checkout configuration by ID
 *
 * @param id - Checkout configuration ID
 * @returns Checkout configuration or null if not found/unauthorized
 */
export async function getCheckoutConfig(
  id: string
): Promise<StoredCheckoutConfig | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const redis = getRedis();
  const config = await redis.get<StoredCheckoutConfig>(
    REDIS_KEYS.checkoutConfig(id)
  );

  if (!config) return null;

  // Check ownership (allow orphaned checkouts)
  if (config.ownerId && config.ownerId !== user.sub) {
    return null;
  }

  return config;
}

/**
 * Get transaction count for a checkout
 */
export async function getCheckoutTransactionCount(
  checkoutId: string
): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  // Verify user has access to this checkout
  const config = await getCheckoutConfig(checkoutId);
  if (!config) return 0;

  const redis = getRedis();
  const txIds = await redis.smembers(
    REDIS_KEYS.checkoutTransactions(checkoutId)
  );
  return txIds.length;
}
