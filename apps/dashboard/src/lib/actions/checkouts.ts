"use server";

/**
 * Checkout Server Actions
 *
 * Server-side actions for checkout CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Note: "Checkout" is the unified term for deposit/payment widgets.
 *
 * TD-002: routes through `services.demoConfigs.*` via `checkoutMapper`.
 * The legacy `mode` field is preserved on the embedded `config` payload.
 * See `lib/actions/earns.ts` for the pattern.
 */

import { revalidatePath } from "next/cache";
import {
  getSessionUser,
  canMutateDemoConfig,
  visibleProspectIds,
  isDemoConfigVisible,
  demoConfigActiveScopeWhere,
  resolveActiveScope,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { services } from "@/lib/services";
import { prospectsByIdFor } from "@/lib/actions/demo-config-prospects";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import { checkoutMapper } from "@/lib/services/demo-config-mappers/checkout";
import type {
  CheckoutMode,
  StoredCheckoutConfig,
} from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from "@/lib/widget-config";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createCheckout(
  name: string,
  mode?: CheckoutMode,
  config?: Partial<WidgetConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }
  try {
    const create = await checkoutMapper.toCreateInput(services.prospects, {
      ownerId: user.dynamicUserId ?? "",
      createdById: user.id,
      name: name && name.length > 0 ? name : null,
      description: null,
      mode: mode ?? "payment",
      prospectId,
      config: await normalizeBrandingLogos({
        ...DEFAULT_WIDGET_CONFIG,
        ...config,
      }),
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = checkoutMapper.toStored(record, prospect);
    revalidatePath("/checkouts");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create checkout:", err);
    return { success: false, error: "Failed to create checkout" };
  }
}

export async function getCheckout(
  id: string
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "checkout") {
      return { success: false, error: "Checkout not found" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: checkoutMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get checkout:", err);
    return { success: false, error: "Failed to get checkout" };
  }
}

export async function updateCheckout(
  id: string,
  updates: {
    name?: string;
    description?: string;
    mode?: CheckoutMode;
    config?: WidgetConfig;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredCheckoutConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "checkout") {
      return { success: false, error: "Checkout not found" };
    }
    if (!(await canMutateDemoConfig(user, existing))) {
      return { success: false, error: "Access denied" };
    }
    const update = await checkoutMapper.toUpdateInput(
      services.prospects,
      existing,
      {
        ownerId: existing.ownerId,
        name: updates.name,
        description: updates.description,
        mode: updates.mode,
        prospectId: updates.prospectId,
        config: await normalizeBrandingLogos(updates.config),
      },
    );
    const updated = await services.demoConfigs.update(id, update);
    const prospect = updated.prospectId
      ? await services.prospects.get(updated.prospectId)
      : null;
    const stored = checkoutMapper.toStored(updated, prospect);
    revalidatePath("/checkouts");
    revalidatePath(`/checkouts/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update checkout:", err);
    return { success: false, error: "Failed to update checkout" };
  }
}

export async function deleteCheckout(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "checkout") {
      return { success: false, error: "Checkout not found" };
    }
    if (!(await canMutateDemoConfig(user, record))) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/checkouts");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete checkout:", err);
    return { success: false, error: "Failed to delete checkout" };
  }
}

export async function getAllCheckoutConfigs(): Promise<{
  checkouts: StoredCheckoutConfig[];
  orphaned: StoredCheckoutConfig[];
}> {
  const user = await getSessionUser();
  if (!user) return { checkouts: [], orphaned: [] };
  const scope = await resolveActiveScope(user);
  // Scoped + kind-filtered in the DB query, not a full-list JS filter.
  // Bounded join fetch (not a paginated list) - same idiom as earns.ts.
  const all = (
    await services.demoConfigs.list({
      where: demoConfigActiveScopeWhere(user, scope),
      kind: "checkout",
      limit: MAX_PAGE_LIMIT,
    })
  ).items;
  const prospectsById = await prospectsByIdFor(all);
  const stored = all.map((record) =>
    checkoutMapper.toStored(
      record,
      record.prospectId ? prospectsById.get(record.prospectId) ?? null : null,
    ),
  );
  const userCheckouts = stored.filter((c) => c.ownerId);
  const orphanedCheckouts = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (a: StoredCheckoutConfig, b: StoredCheckoutConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    checkouts: userCheckouts.sort(sortByUpdated),
    orphaned: orphanedCheckouts.sort(sortByUpdated),
  };
}

/**
 * Fetches a single checkout configuration by ID (auth-required, used by
 * layout/settings pages). Returns `null` on miss or access denied.
 */
export async function getCheckoutConfig(
  id: string
): Promise<StoredCheckoutConfig | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const record = await services.demoConfigs.get(id);
  if (!record || record.kind !== "checkout") return null;
  const visible = await visibleProspectIds(user);
  // Same not-found shape (null) as a missing id - no existence oracle.
  if (!isDemoConfigVisible(user, visible, record)) return null;
  const prospect = record.prospectId
    ? await services.prospects.get(record.prospectId)
    : null;
  return checkoutMapper.toStored(record, prospect);
}

/**
 * Get transaction count for a checkout
 *
 * Note: transaction data still lives in Redis under the `checkout:*:txs`
 * keyspace (independent of demo-config storage). That's unchanged by
 * TD-002 — only per-demo-type config rows route through the service.
 */
export async function getCheckoutTransactionCount(
  checkoutId: string
): Promise<number> {
  const user = await getSessionUser();
  if (!user) return 0;
  const config = await getCheckoutConfig(checkoutId);
  if (!config) return 0;
  const redis = getRedis();
  const txIds = await redis.smembers(
    REDIS_KEYS.checkoutTransactions(checkoutId)
  );
  return txIds.length;
}
