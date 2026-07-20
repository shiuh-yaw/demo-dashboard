"use server";

/**
 * Visa Direct Config Server Actions
 *
 * Server-side actions for Visa Direct config CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * TD-002: routes through `services.demoConfigs.*` via `visaDirectMapper`.
 * See `lib/actions/earns.ts` for the pattern.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeBrandingLogos } from "@/lib/normalize-logo";
import { services } from "@/lib/services";
import { visaDirectMapper } from "@/lib/services/demo-config-mappers/visa-direct";
import type {
  StoredVisaDirectConfig,
  VisaDirectConfig,
} from "@/lib/types/dashboard";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createVisaDirectConfig(
  name: string,
  config?: Partial<VisaDirectConfig>
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const create = await visaDirectMapper.toCreateInput(services.prospects, {
      ownerId: user.sub,
      name: name && name.length > 0 ? name : null,
      description: null,
      config: (await normalizeBrandingLogos(config ?? {})) as VisaDirectConfig,
    });
    const record = await services.demoConfigs.create(create);
    const prospect = await services.prospects.get(record.prospectId);
    const stored = visaDirectMapper.toStored(record, prospect);
    revalidatePath("/");
    revalidatePath("/visa-direct");
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to create Visa Direct config:", err);
    return { success: false, error: "Failed to create Visa Direct config" };
  }
}

export async function getVisaDirectConfig(
  id: string
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "visa-direct") {
      return { success: false, error: "Visa Direct config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return { success: true, data: visaDirectMapper.toStored(record, prospect) };
  } catch (err) {
    console.error("Failed to get Visa Direct config:", err);
    return { success: false, error: "Failed to get Visa Direct config" };
  }
}

export async function updateVisaDirectConfig(
  id: string,
  updates: {
    name?: string;
    description?: string;
    config?: Partial<VisaDirectConfig>;
  }
): Promise<ActionResult<StoredVisaDirectConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const existing = await services.demoConfigs.get(id);
    if (!existing || existing.kind !== "visa-direct") {
      return { success: false, error: "Visa Direct config not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    const update = await visaDirectMapper.toUpdateInput(
      services.prospects,
      existing,
      {
        ownerId: existing.ownerId || user.sub,
        name: updates.name,
        description: updates.description,
        config: await normalizeBrandingLogos(updates.config),
      },
    );
    const updated = await services.demoConfigs.update(id, update);
    const prospect = await services.prospects.get(updated.prospectId);
    const stored = visaDirectMapper.toStored(updated, prospect);
    revalidatePath("/");
    revalidatePath("/visa-direct");
    revalidatePath(`/visa-direct/${id}`);
    return { success: true, data: stored };
  } catch (err) {
    console.error("Failed to update Visa Direct config:", err);
    return { success: false, error: "Failed to update Visa Direct config" };
  }
}

export async function deleteVisaDirectConfig(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "visa-direct") {
      return { success: false, error: "Visa Direct config not found" };
    }
    if (record.ownerId && record.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    await services.demoConfigs.delete(id);
    revalidatePath("/");
    revalidatePath("/visa-direct");
    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete Visa Direct config:", err);
    return { success: false, error: "Failed to delete Visa Direct config" };
  }
}

export async function getAllVisaDirectConfigs(): Promise<{
  configs: StoredVisaDirectConfig[];
  orphaned: StoredVisaDirectConfig[];
}> {
  const user = await getCurrentUser();
  if (!user) return { configs: [], orphaned: [] };
  const all = await services.demoConfigs.list({ kind: "visa-direct" });
  const stored = await Promise.all(
    all.map(async (record) => {
      const prospect = record.prospectId
        ? await services.prospects.get(record.prospectId)
        : null;
      return visaDirectMapper.toStored(record, prospect);
    }),
  );
  const userConfigs = stored.filter((c) => c.ownerId === user.sub);
  const orphanedConfigs = stored.filter((c) => !c.ownerId);
  const sortByUpdated = (
    a: StoredVisaDirectConfig,
    b: StoredVisaDirectConfig,
  ) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return {
    configs: userConfigs.sort(sortByUpdated),
    orphaned: orphanedConfigs.sort(sortByUpdated),
  };
}

export async function getVisaDirectConfigPublic(
  id: string
): Promise<StoredVisaDirectConfig | null> {
  try {
    const record = await services.demoConfigs.get(id);
    if (!record || record.kind !== "visa-direct") return null;
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;
    return visaDirectMapper.toStored(record, prospect);
  } catch (err) {
    console.error("Failed to get Visa Direct config:", err);
    return null;
  }
}
