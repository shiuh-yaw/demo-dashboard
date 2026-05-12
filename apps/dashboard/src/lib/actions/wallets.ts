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
import { getCurrentUser } from "@/lib/auth/session";
import { services } from "@/lib/services";
import { walletMapper } from "@/lib/services/demo-config-mappers/wallet";
import type { StoredWalletConfig, WalletConfig } from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createWalletConfig(
  name: string,
  config?: Partial<WalletConfig>
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  try {
    const create = await walletMapper.toCreateInput(services.brands, {
      ownerId: user.sub,
      name: name && name.length > 0 ? name : null,
      description: null,
      config: (config ?? {}) as WalletConfig,
    });
    const record = await services.demoConfigs.create(create);
    const brand = await services.brands.get(record.brandId);
    const stored = walletMapper.toStored(record, brand);
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
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const brand = record.brandId
      ? await services.brands.get(record.brandId)
      : null;
    return { success: true, data: walletMapper.toStored(record, brand) };
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
  }
): Promise<ActionResult<StoredWalletConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const update = await walletMapper.toUpdateInput(
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
    const stored = walletMapper.toStored(updated, brand);
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
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "wallet") {
      return { success: false, error: "Wallet config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
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
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };

  const all = await services.demoConfigs.list({ kind: "wallet" });
  const stored = await Promise.all(
    all.map(async (record) => {
      const brand = record.brandId
        ? await services.brands.get(record.brandId)
        : null;
      return walletMapper.toStored(record, brand);
    }),
  );
  const userConfigs = stored.filter((c) => c.ownerId === user.sub);
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
    const brand = record.brandId
      ? await services.brands.get(record.brandId)
      : null;
    return walletMapper.toStored(record, brand);
  } catch (err) {
    console.error("Failed to get Wallet config:", err);
    return null;
  }
}
