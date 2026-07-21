"use server";

/**
 * Wallet Config Server Actions
 *
 * Server-side actions for Wallet config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` via `walletMapper`. See
 * `lib/actions/earns.ts` for the pattern.
 */

import { revalidatePath } from "next/cache";
import {
  getSessionUser,
  canMutateDemoConfig,
  visibleProspectIds,
  isDemoConfigVisible,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { services } from "@/lib/services";
import { walletMapper } from "@/lib/services/demo-config-mappers/wallet";
import type { StoredWalletConfig, WalletConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createWalletConfig(
  name: string,
  config?: Partial<WalletConfig>,
  prospectId: string | null = null
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }
  try {
    const create = await walletMapper.toCreateInput(services.prospects, {
      ownerId: user.dynamicUserId ?? "",
      createdById: user.id,
      name: name && name.length > 0 ? name : null,
      description: null,
      prospectId,
      config: (await normalizeBrandingLogos(config ?? {})) as WalletConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    const stored = walletMapper.toStored(record, prospect);
    revalidatePath("/");
    revalidatePath("/wallets");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Wallet config:", err);
    return { success: false, error: "Failed to create Wallet config" };
  }
}

export async function getWalletConfig(
  id: string
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    const visible = await visibleProspectIds(user);
    if (!isDemoConfigVisible(user, visible, record)) {
      // Same not-found shape as a missing id - no existence oracle.
      return { success: false, error: "Wallet config not found" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: walletMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Wallet config:", err);
    return { success: false, error: "Failed to get Wallet config" };
  }
}

export async function updateWalletConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<WalletConfig>;
    prospectId?: string | null;
  }
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    if (!(await canMutateDemoConfig(user, existing))) {
      return { success: false, error: "Access denied" };
    }
    const update = await walletMapper.toUpdateInput(
      services.prospects,
      existing,
      {
        ownerId: existing.ownerId,
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
    const stored = walletMapper.toStored(updated, prospect);
    revalidatePath("/");
    revalidatePath("/wallets");
    revalidatePath(`/wallets/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Wallet config:", err);
    return { success: false, error: "Failed to update Wallet config" };
  }
}

export async function deleteWalletConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    if (!(await canMutateDemoConfig(user, record))) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/");
    revalidatePath("/wallets");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Wallet config:", err);
    return { success: false, error: "Failed to delete Wallet config" };
  }
}

export async function getAllWalletConfigs(): Promise<{
  configs: StoredWalletConfig[];
  orphaned: StoredWalletConfig[];
}> {
  const user = await getSessionUser();
  if (!user) return { configs: [], orphaned: [] };

  const visible = await visibleProspectIds(user);
  const all = (await services.demoConfigs.list({ kind: "wallet" })).filter((r) =>
    isDemoConfigVisible(user, visible, r),
  );
  const stored = await Promise.all(
    all.map(async (record) => {
      const prospect = record.prospectId
        ? await services.prospects.get(record.prospectId)
        : null;
      return walletMapper.toStored(record, prospect);
    }),
  );
  const userConfigs = stored.filter((c) => c.ownerId);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (a: StoredWalletConfig, b: StoredWalletConfig) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

export async function getWalletConfigPublic(
  id: string
): Promise<StoredWalletConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "wallet") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return walletMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Wallet config:", err);
    return null;
  }
}
