"use server";

/**
 * Widget Server Actions
 *
 * @deprecated Use actions from "@/lib/actions/checkouts" instead.
 * This file is maintained for backwards compatibility.
 *
 * Server-side actions for widget CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import type { StoredWidgetConfig } from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from "@/lib/widget-config";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new widget configuration
 * @deprecated Use createCheckout from "@/lib/actions/checkouts" instead
 */
export async function createWidget(
  name: string,
  config?: Partial<WidgetConfig>
): Promise<ActionResult<StoredWidgetConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    const newConfig: StoredWidgetConfig = {
      id,
      name: name || "Untitled Widget",
      config: await normalizeBrandingLogos({
        ...DEFAULT_WIDGET_CONFIG,
        ...config,
      }),
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.widgetConfig(id), newConfig);
    await redis.sadd(REDIS_KEYS.widgetConfigList, id);

    revalidatePath("/");
    revalidatePath("/widgets");
    revalidatePath("/checkouts"); // Also revalidate checkouts for backwards compatibility

    return { success: true, data: newConfig };
  } catch (err) {
    console.error("Failed to create widget:", err);
    return { success: false, error: "Failed to create widget" };
  }
}

/**
 * Get a widget configuration by ID
 * @deprecated Use getCheckout from "@/lib/actions/checkouts" instead
 */
export async function getWidget(
  id: string
): Promise<ActionResult<StoredWidgetConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredWidgetConfig>(
      REDIS_KEYS.widgetConfig(id)
    );

    if (!config) {
      return { success: false, error: "Widget not found" };
    }

    // Check ownership (allow orphaned widgets)
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: config };
  } catch (err) {
    console.error("Failed to get widget:", err);
    return { success: false, error: "Failed to get widget" };
  }
}

/**
 * Update an existing widget configuration
 * @deprecated Use updateCheckout from "@/lib/actions/checkouts" instead
 */
export async function updateWidget(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: WidgetConfig;
  }
): Promise<ActionResult<StoredWidgetConfig>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const existing = await redis.get<StoredWidgetConfig>(
      REDIS_KEYS.widgetConfig(id)
    );

    if (!existing) {
      return { success: false, error: "Widget not found" };
    }

    // Check ownership (allow orphaned widgets to be claimed)
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const updated: StoredWidgetConfig = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      config: updates.config
        ? await normalizeBrandingLogos(updates.config)
        : existing.config,
      ownerId: existing.ownerId || user.sub, // Claim orphaned widgets
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.widgetConfig(id), updated);

    revalidatePath("/");
    revalidatePath("/widgets");
    revalidatePath(`/widgets/${id}`);
    revalidatePath("/checkouts"); // Also revalidate checkouts for backwards compatibility
    revalidatePath(`/checkouts/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to update widget:", err);
    return { success: false, error: "Failed to update widget" };
  }
}

/**
 * Delete a widget configuration
 * @deprecated Use deleteCheckout from "@/lib/actions/checkouts" instead
 */
export async function deleteWidget(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const config = await redis.get<StoredWidgetConfig>(
      REDIS_KEYS.widgetConfig(id)
    );

    if (!config) {
      return { success: false, error: "Widget not found" };
    }

    // Check ownership
    if (config.ownerId && config.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await redis.del(REDIS_KEYS.widgetConfig(id));
    await redis.srem(REDIS_KEYS.widgetConfigList, id);

    revalidatePath("/");
    revalidatePath("/widgets");
    revalidatePath("/checkouts"); // Also revalidate checkouts for backwards compatibility

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete widget:", err);
    return { success: false, error: "Failed to delete widget" };
  }
}

/**
 * Fetches widget configurations for the current user and orphaned widgets
 *
 * @deprecated Use getAllCheckoutConfigs from "@/lib/actions/checkouts" instead
 * @returns Object with user's widgets and orphaned widgets, sorted by updatedAt descending
 * @throws Error if Redis operation fails or times out
 */
export async function getAllWidgetConfigs(): Promise<{
  widgets: StoredWidgetConfig[];
  orphaned: StoredWidgetConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { widgets: [], orphaned: [] };

  const redis = getRedis();

  // Get all config IDs from the list
  const configIds = await redis.smembers(REDIS_KEYS.widgetConfigList);

  if (!configIds || configIds.length === 0) {
    return { widgets: [], orphaned: [] };
  }

  // Fetch all configs
  const fetchedConfigs = await Promise.all(
    configIds.map(async (id) => {
      const config = await redis.get<StoredWidgetConfig>(
        REDIS_KEYS.widgetConfig(id)
      );
      return config;
    })
  );

  // Filter out nulls
  const validConfigs = fetchedConfigs.filter(
    (c): c is StoredWidgetConfig => c !== null
  );

  // Separate user's widgets and orphaned widgets
  const userWidgets = user
    ? validConfigs.filter((c) => c.ownerId === user.sub)
    : [];
  const orphanedWidgets = validConfigs.filter((c) => !c.ownerId);

  // Sort both lists by updatedAt descending
  const sortByUpdated = (a: StoredWidgetConfig, b: StoredWidgetConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    widgets: userWidgets.sort(sortByUpdated),
    orphaned: orphanedWidgets.sort(sortByUpdated),
  };
}

/**
 * Fetches a single widget configuration by ID
 *
 * @deprecated Use getCheckoutConfig from "@/lib/actions/checkouts" instead
 * @param id - Widget configuration ID
 * @returns Widget configuration or null if not found/unauthorized
 */
export async function getWidgetConfig(
  id: string
): Promise<StoredWidgetConfig | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const redis = getRedis();
  const config = await redis.get<StoredWidgetConfig>(
    REDIS_KEYS.widgetConfig(id)
  );

  if (!config) return null;

  // Check ownership (allow orphaned widgets)
  if (config.ownerId && config.ownerId !== user.sub) {
    return null;
  }

  return config;
}
