"use server";

/**
 * Brand Profile Server Actions
 *
 * Server-side actions for Brand Profile CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Brand profiles store unified branding settings that are applied
 * across all demo types (Earn, Checkouts, Wallet, Remittance).
 *
 * Phase 2-brand-cutover (2026-05-06): brand-row persistence routes
 * through `services.brands.*` (Postgres when USE_POSTGRES_BRANDS=true,
 * Redis otherwise). The demo-config side-effects below still write to
 * Redis directly because Earn / Wallet / Checkout / Remittance configs
 * haven't migrated yet (they land in PR 2-others).
 */

import { revalidatePath } from "next/cache";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import { brandService } from "@/lib/services";
import {
  brandToProfile,
  createRequestToInput,
  demosToUpdateInput,
  updateRequestToInput,
} from "@/lib/services/brand-mapper";
import type {
  BrandProfile,
  BrandSettings,
  BrandTheme,
  CreateBrandProfileRequest,
  UpdateBrandProfileRequest,
  StoredEarnConfig,
  StoredCheckoutConfig,
  StoredWalletConfig,
  StoredRemittanceConfig,
} from "@/lib/types/dashboard";
import {
  DEFAULT_BRAND_SETTINGS,
  DEFAULT_EARN_CONFIG,
  DEFAULT_WALLET_CONFIG,
  DEFAULT_REMITTANCE_CONFIG,
} from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widget-config";
import { createId } from "@paralleldrive/cuid2";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create demo configs for a brand profile
 * Returns the IDs of created configs
 */
async function createBrandDemoConfigs(
  brandId: string,
  brandName: string,
  brand: BrandSettings,
  ownerId: string,
  options?: {
    earn?: boolean;
    checkouts?: boolean;
    wallet?: boolean;
    remittance?: boolean;
  },
): Promise<{
  earn?: string;
  checkouts?: string;
  wallet?: string;
  remittance?: string;
}> {
  const redis = getRedis();
  const now = new Date().toISOString();
  const demos: {
    earn?: string;
    checkouts?: string;
    wallet?: string;
    remittance?: string;
  } = {};

  // Create demos only if explicitly requested (or all if no options provided)
  const createAll = !options || Object.keys(options).length === 0;
  const createEarn = createAll || options?.earn === true;
  const createCheckouts = createAll || options?.checkouts === true;
  const createWallet = createAll || options?.wallet === true;
  const createRemittance = createAll || options?.remittance === true;

  // Create Earn config with brand settings
  if (createEarn) {
    const earnId = createId();
    const theme: Partial<BrandTheme> = brand.theme || {};
    const earnConfig: StoredEarnConfig = {
      id: earnId,
      name: `${brandName} - Earn`,
      description: `Auto-generated from brand profile: ${brandId}`,
      config: {
        theme: {
          ...DEFAULT_EARN_CONFIG.theme,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor || brand.primaryColor,
          primaryHoverColor: theme.primaryHoverColor || brand.primaryColor,
          borderRadius: brand.borderRadius,
          // Apply extended theme colors if available
          backgroundColor:
            theme.pageBackground || DEFAULT_EARN_CONFIG.theme?.backgroundColor,
          backgroundLightColor:
            theme.background || DEFAULT_EARN_CONFIG.theme?.backgroundLightColor,
          foregroundColor:
            theme.foreground || DEFAULT_EARN_CONFIG.theme?.foregroundColor,
          mutedTextColor:
            theme.mutedTextColor || DEFAULT_EARN_CONFIG.theme?.mutedTextColor,
          borderColor:
            theme.borderColor || DEFAULT_EARN_CONFIG.theme?.borderColor,
        },
        branding: {
          ...DEFAULT_EARN_CONFIG.branding,
          logo: brand.logo === "custom" ? "custom" : "dynamic",
          logoUrl: brand.logoUrl,
        },
        layout: DEFAULT_EARN_CONFIG.layout,
      },
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.earnConfig(earnId), earnConfig);
    await redis.sadd(REDIS_KEYS.earnConfigList, earnId);
    demos.earn = earnId;
  }

  // Create Checkouts config with brand settings
  if (createCheckouts) {
    const checkoutId = createId();
    const theme: Partial<BrandTheme> = brand.theme || {};
    const checkoutConfig: StoredCheckoutConfig = {
      id: checkoutId,
      name: `${brandName} - Checkouts`,
      description: `Auto-generated from brand profile: ${brandId}`,
      mode: "payment",
      config: {
        ...DEFAULT_WIDGET_CONFIG,
        theme: {
          ...DEFAULT_WIDGET_CONFIG.theme,
          primaryColor: brand.primaryColor,
          accentColor: brand.accentColor || brand.primaryColor,
          borderRadius: brand.borderRadius || "md",
          // Apply extended theme colors if available
          pageBackground:
            theme.pageBackground || DEFAULT_WIDGET_CONFIG.theme?.pageBackground,
          background:
            theme.background || DEFAULT_WIDGET_CONFIG.theme?.background,
          foreground:
            theme.foreground || DEFAULT_WIDGET_CONFIG.theme?.foreground,
          mutedTextColor:
            theme.mutedTextColor || DEFAULT_WIDGET_CONFIG.theme?.mutedTextColor,
          borderColor:
            theme.borderColor || DEFAULT_WIDGET_CONFIG.theme?.borderColor,
          rowBackground:
            theme.rowBackground || DEFAULT_WIDGET_CONFIG.theme?.rowBackground,
          rowHoverBackground:
            theme.rowHoverBackground ||
            DEFAULT_WIDGET_CONFIG.theme?.rowHoverBackground,
          gradientFrom:
            theme.gradientFrom || DEFAULT_WIDGET_CONFIG.theme?.gradientFrom,
          gradientTo:
            theme.gradientTo || DEFAULT_WIDGET_CONFIG.theme?.gradientTo,
        },
        branding: {
          ...DEFAULT_WIDGET_CONFIG.branding,
          // WidgetBranding uses 'logo' as URL directly, not a type enum
          logo: brand.logo === "custom" ? brand.logoUrl : undefined,
        },
      },
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.checkoutConfig(checkoutId), checkoutConfig);
    await redis.sadd(REDIS_KEYS.checkoutConfigList, checkoutId);
    demos.checkouts = checkoutId;
  }

  // Create Wallet config with brand settings
  if (createWallet) {
    const walletId = createId();
    const theme: Partial<BrandTheme> = brand.theme || {};
    const walletConfig: StoredWalletConfig = {
      id: walletId,
      name: `${brandName} - Wallet`,
      description: `Auto-generated from brand profile: ${brandId}`,
      config: {
        theme: {
          ...DEFAULT_WALLET_CONFIG.theme,
          primaryColor: brand.primaryColor,
          primaryHoverColor:
            theme.primaryHoverColor ||
            DEFAULT_WALLET_CONFIG.theme?.primaryHoverColor,
          accentColor: brand.accentColor || brand.primaryColor,
          borderRadius: brand.borderRadius,
          // Apply extended theme colors if available
          pageBackground:
            theme.pageBackground || DEFAULT_WALLET_CONFIG.theme?.pageBackground,
          background:
            theme.background || DEFAULT_WALLET_CONFIG.theme?.background,
          foreground:
            theme.foreground || DEFAULT_WALLET_CONFIG.theme?.foreground,
          mutedTextColor:
            theme.mutedTextColor || DEFAULT_WALLET_CONFIG.theme?.mutedTextColor,
          borderColor:
            theme.borderColor || DEFAULT_WALLET_CONFIG.theme?.borderColor,
          rowBackground:
            theme.rowBackground || DEFAULT_WALLET_CONFIG.theme?.rowBackground,
          rowHoverBackground:
            theme.rowHoverBackground ||
            DEFAULT_WALLET_CONFIG.theme?.rowHoverBackground,
          gradientFrom:
            theme.gradientFrom || DEFAULT_WALLET_CONFIG.theme?.gradientFrom,
          gradientTo:
            theme.gradientTo || DEFAULT_WALLET_CONFIG.theme?.gradientTo,
        },
        branding: {
          // WalletBranding uses 'logo' as URL directly (like Checkouts)
          logo: brand.logo === "custom" ? brand.logoUrl : undefined,
          showPoweredBy: true,
        },
      },
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.walletConfig(walletId), walletConfig);
    await redis.sadd(REDIS_KEYS.walletConfigList, walletId);
    demos.wallet = walletId;
  }

  // Create Remittance config with brand settings
  if (createRemittance) {
    const remittanceId = createId();
    // Carry the full brand theme through to the remittance config so
    // pageBackground / surface / foreground / muted / border / etc.
    // flow into the remittance app's `<ThemeStyleTag>` overrides. Until
    // this widening, remittance only got primary + secondary and every
    // other token snapped back to the static defaults in globals.css.
    const remittanceTheme: Partial<BrandTheme> = brand.theme || {};
    const remittanceConfig: StoredRemittanceConfig = {
      id: remittanceId,
      name: `${brandName} - Remittance`,
      description: `Auto-generated from brand profile: ${brandId}`,
      config: {
        theme: {
          ...DEFAULT_REMITTANCE_CONFIG.theme,
          primaryColor: brand.primaryColor,
          primaryHoverColor: remittanceTheme.primaryHoverColor,
          accentColor: brand.accentColor || brand.primaryColor,
          secondaryColor: brand.accentColor || brand.primaryColor,
          pageBackground: remittanceTheme.pageBackground,
          background: remittanceTheme.background,
          foregroundColor: remittanceTheme.foreground,
          mutedTextColor: remittanceTheme.mutedTextColor,
          borderColor: remittanceTheme.borderColor,
          rowBackground: remittanceTheme.rowBackground,
          rowHoverBackground: remittanceTheme.rowHoverBackground,
          gradientFrom: remittanceTheme.gradientFrom,
          gradientTo: remittanceTheme.gradientTo,
        },
        branding: {
          logoUrl: brand.logo === "custom" ? brand.logoUrl : undefined,
        },
      },
      ownerId,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.remittanceConfig(remittanceId), remittanceConfig);
    await redis.sadd(REDIS_KEYS.remittanceConfigList, remittanceId);
    demos.remittance = remittanceId;
  }

  return demos;
}

/**
 * Update demo configs when brand settings change
 */
async function updateBrandDemoConfigs(
  profile: BrandProfile,
  brand: BrandSettings,
): Promise<void> {
  const redis = getRedis();
  const now = new Date().toISOString();

  // Update Earn config if it exists
  if (profile.demos.earn) {
    const earnConfig = await redis.get<StoredEarnConfig>(
      REDIS_KEYS.earnConfig(profile.demos.earn),
    );
    if (earnConfig) {
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updated: StoredEarnConfig = {
        ...earnConfig,
        config: {
          ...earnConfig.config,
          theme: {
            ...earnConfig.config.theme,
            primaryColor: brand.primaryColor,
            accentColor: brand.accentColor || brand.primaryColor,
            primaryHoverColor: theme.primaryHoverColor || brand.primaryColor,
              borderRadius: brand.borderRadius,
            // Apply extended theme colors if available
            ...(theme.pageBackground && {
              backgroundColor: theme.pageBackground,
            }),
            ...(theme.background && { backgroundLightColor: theme.background }),
            ...(theme.foreground && { foregroundColor: theme.foreground }),
            ...(theme.mutedTextColor && {
              mutedTextColor: theme.mutedTextColor,
            }),
            ...(theme.borderColor && { borderColor: theme.borderColor }),
          },
          branding: {
            ...earnConfig.config.branding,
            logo: brand.logo === "custom" ? "custom" : "dynamic",
            logoUrl: brand.logoUrl,
          },
        },
        updatedAt: now,
      };
      await redis.set(REDIS_KEYS.earnConfig(profile.demos.earn), updated);
    }
  }

  // Update Checkouts config if it exists
  if (profile.demos.checkouts) {
    const checkoutConfig = await redis.get<StoredCheckoutConfig>(
      REDIS_KEYS.checkoutConfig(profile.demos.checkouts),
    );
    if (checkoutConfig) {
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updated: StoredCheckoutConfig = {
        ...checkoutConfig,
        config: {
          ...checkoutConfig.config,
          theme: {
            ...checkoutConfig.config.theme,
            primaryColor: brand.primaryColor,
            accentColor: brand.accentColor || brand.primaryColor,
            borderRadius: brand.borderRadius || "md",
            // Apply extended theme colors if available
            ...(theme.pageBackground && {
              pageBackground: theme.pageBackground,
            }),
            ...(theme.background && { background: theme.background }),
            ...(theme.foreground && { foreground: theme.foreground }),
            ...(theme.mutedTextColor && {
              mutedTextColor: theme.mutedTextColor,
            }),
            ...(theme.borderColor && { borderColor: theme.borderColor }),
            ...(theme.rowBackground && { rowBackground: theme.rowBackground }),
            ...(theme.rowHoverBackground && {
              rowHoverBackground: theme.rowHoverBackground,
            }),
            ...(theme.gradientFrom && { gradientFrom: theme.gradientFrom }),
            ...(theme.gradientTo && { gradientTo: theme.gradientTo }),
          },
          branding: {
            ...checkoutConfig.config.branding,
            // WidgetBranding uses 'logo' as URL directly, not a type enum
            logo: brand.logo === "custom" ? brand.logoUrl : undefined,
          },
        },
        updatedAt: now,
      };
      await redis.set(
        REDIS_KEYS.checkoutConfig(profile.demos.checkouts),
        updated,
      );
    }
  }

  // Update Wallet config if it exists
  if (profile.demos.wallet) {
    const walletConfig = await redis.get<StoredWalletConfig>(
      REDIS_KEYS.walletConfig(profile.demos.wallet),
    );
    if (walletConfig) {
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updated: StoredWalletConfig = {
        ...walletConfig,
        config: {
          ...walletConfig.config,
          theme: {
            ...walletConfig.config.theme,
            primaryColor: brand.primaryColor,
            primaryHoverColor:
              theme.primaryHoverColor ||
              walletConfig.config.theme?.primaryHoverColor,
            accentColor: brand.accentColor || brand.primaryColor,
            borderRadius: brand.borderRadius,
            // Apply extended theme colors if available
            ...(theme.pageBackground && {
              pageBackground: theme.pageBackground,
            }),
            ...(theme.background && { background: theme.background }),
            ...(theme.foreground && { foreground: theme.foreground }),
            ...(theme.mutedTextColor && {
              mutedTextColor: theme.mutedTextColor,
            }),
            ...(theme.borderColor && { borderColor: theme.borderColor }),
            ...(theme.rowBackground && { rowBackground: theme.rowBackground }),
            ...(theme.rowHoverBackground && {
              rowHoverBackground: theme.rowHoverBackground,
            }),
            ...(theme.gradientFrom && { gradientFrom: theme.gradientFrom }),
            ...(theme.gradientTo && { gradientTo: theme.gradientTo }),
          },
          branding: {
            ...walletConfig.config.branding,
            // WalletBranding uses 'logo' as URL directly (like Checkouts)
            logo: brand.logo === "custom" ? brand.logoUrl : undefined,
          },
        },
        updatedAt: now,
      };
      await redis.set(REDIS_KEYS.walletConfig(profile.demos.wallet), updated);
    }
  }

  // Update Remittance config if it exists. Carry the full brand theme
  // through so the remittance app receives pageBackground / surface /
  // foreground / muted / border / row* / gradient* — not just primary
  // + secondary like it used to.
  if (profile.demos.remittance) {
    const remittanceConfig = await redis.get<StoredRemittanceConfig>(
      REDIS_KEYS.remittanceConfig(profile.demos.remittance),
    );
    if (remittanceConfig) {
      const remittanceTheme: Partial<BrandTheme> = brand.theme || {};
      const updated: StoredRemittanceConfig = {
        ...remittanceConfig,
        config: {
          theme: {
            ...remittanceConfig.config.theme,
            primaryColor: brand.primaryColor,
            primaryHoverColor: remittanceTheme.primaryHoverColor,
            accentColor: brand.accentColor || brand.primaryColor,
            secondaryColor: brand.accentColor || brand.primaryColor,
            pageBackground: remittanceTheme.pageBackground,
            background: remittanceTheme.background,
            foregroundColor: remittanceTheme.foreground,
            mutedTextColor: remittanceTheme.mutedTextColor,
            borderColor: remittanceTheme.borderColor,
            rowBackground: remittanceTheme.rowBackground,
            rowHoverBackground: remittanceTheme.rowHoverBackground,
            gradientFrom: remittanceTheme.gradientFrom,
            gradientTo: remittanceTheme.gradientTo,
          },
          branding: {
            logoUrl: brand.logo === "custom" ? brand.logoUrl : undefined,
          },
        },
        updatedAt: now,
      };
      await redis.set(
        REDIS_KEYS.remittanceConfig(profile.demos.remittance),
        updated,
      );
    }
  }
}

/**
 * Delete demo configs associated with a brand profile
 */
async function deleteBrandDemoConfigs(demos: {
  earn?: string;
  checkouts?: string;
  wallet?: string;
  remittance?: string;
}): Promise<void> {
  const redis = getRedis();

  if (demos.earn) {
    await redis.del(REDIS_KEYS.earnConfig(demos.earn));
    await redis.srem(REDIS_KEYS.earnConfigList, demos.earn);
  }

  if (demos.checkouts) {
    await redis.del(REDIS_KEYS.checkoutConfig(demos.checkouts));
    await redis.srem(REDIS_KEYS.checkoutConfigList, demos.checkouts);
  }

  if (demos.wallet) {
    await redis.del(REDIS_KEYS.walletConfig(demos.wallet));
    await redis.srem(REDIS_KEYS.walletConfigList, demos.wallet);
  }

  if (demos.remittance) {
    await redis.del(REDIS_KEYS.remittanceConfig(demos.remittance));
    await redis.srem(REDIS_KEYS.remittanceConfigList, demos.remittance);
  }
}

/**
 * Create a new brand profile
 */
export async function createBrandProfile(
  request: CreateBrandProfileRequest,
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    // 1) Create the canonical Brand row first so the id is stable.
    const created = await brandService.create(
      createRequestToInput(user.sub, request),
    );

    // 2) Build the BrandSettings the demo-config orchestration expects.
    const merged: BrandSettings = {
      ...DEFAULT_BRAND_SETTINGS,
      ...request.brand,
    };

    // 3) Spin up the demo configs in Redis (unchanged orchestration).
    const demos = await createBrandDemoConfigs(
      created.id,
      created.name,
      merged,
      user.sub,
      request.generateDemos,
    );

    // 4) Persist the demo-config ids back onto the brand row so the
    //    BrandProfile aggregate stays self-contained.
    const finalRow = await brandService.update(
      created.id,
      demosToUpdateInput(demos),
    );

    revalidatePath("/");
    revalidatePath("/brands");

    return { success: true, data: brandToProfile(finalRow) };
  } catch (err) {
    console.error("Failed to create brand profile:", err);
    return { success: false, error: "Failed to create brand profile" };
  }
}

/**
 * Get a brand profile by ID
 */
export async function getBrandProfile(
  id: string,
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const brand = await brandService.get(id);
    if (!brand) {
      return { success: false, error: "Brand profile not found" };
    }
    if (brand.ownerId && brand.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    return { success: true, data: brandToProfile(brand) };
  } catch (err) {
    console.error("Failed to get brand profile:", err);
    return { success: false, error: "Failed to get brand profile" };
  }
}

/**
 * Update an existing brand profile
 */
export async function updateBrandProfile(
  id: string,
  request: UpdateBrandProfileRequest,
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const existing = await brandService.get(id);
    if (!existing) {
      return { success: false, error: "Brand profile not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Persist the brand-row changes first so demo-config updates see
    // the new theme.
    const data = updateRequestToInput(request);
    let updated = await brandService.update(id, data);

    // Claim orphan rows by patching ownerId. UpdateBrandInput
    // intentionally doesn't expose ownerId — only this code path needs
    // to mutate it, so we route through upsertWithId which overwrites
    // every column. We project from the fresh `updated` row to keep
    // every field consistent.
    if (!existing.ownerId && user.sub) {
      updated = await brandService.upsertWithId(updated.id, {
        ownerId: user.sub,
        name: updated.name,
        description: updated.description,
        companyUrl: updated.companyUrl,
        logo: updated.logo,
        logoUrl: updated.logoUrl,
        borderRadius: updated.borderRadius,
        primaryColor: updated.primaryColor,
        primaryHoverColor: updated.primaryHoverColor,
        secondaryColor: updated.secondaryColor,
        accentColor: updated.accentColor,
        pageBackground: updated.pageBackground,
        background: updated.background,
        foreground: updated.foreground,
        mutedTextColor: updated.mutedTextColor,
        borderColor: updated.borderColor,
        rowBackground: updated.rowBackground,
        rowHoverBackground: updated.rowHoverBackground,
        gradientFrom: updated.gradientFrom,
        gradientTo: updated.gradientTo,
        demoEarnId: updated.demoEarnId,
        demoCheckoutsId: updated.demoCheckoutsId,
        demoWalletId: updated.demoWalletId,
        demoRemittanceId: updated.demoRemittanceId,
      });
    }

    // Update demo configs using the merged settings.
    const merged: BrandSettings = {
      ...DEFAULT_BRAND_SETTINGS,
      ...request.brand,
    };
    await updateBrandDemoConfigs(brandToProfile(updated), merged);

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: brandToProfile(updated) };
  } catch (err) {
    console.error("Failed to update brand profile:", err);
    return { success: false, error: "Failed to update brand profile" };
  }
}

/**
 * Delete a brand profile and its associated demo configs
 */
export async function deleteBrandProfile(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const brand = await brandService.get(id);
    if (!brand) {
      return { success: false, error: "Brand profile not found" };
    }
    if (brand.ownerId && brand.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await deleteBrandDemoConfigs({
      earn: brand.demoEarnId ?? undefined,
      checkouts: brand.demoCheckoutsId ?? undefined,
      wallet: brand.demoWalletId ?? undefined,
      remittance: brand.demoRemittanceId ?? undefined,
    });
    await brandService.delete(id);

    revalidatePath("/");
    revalidatePath("/brands");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete brand profile:", err);
    return { success: false, error: "Failed to delete brand profile" };
  }
}

/**
 * Fetches all brand profiles for the current user and orphaned profiles
 *
 * @returns Object with user's profiles and orphaned profiles, sorted by updatedAt descending
 */
export async function getAllBrandProfiles(): Promise<{
  profiles: BrandProfile[];
  orphaned: BrandProfile[];
}> {
  const user = await getCurrentUser();
  if (!user) return { profiles: [], orphaned: [] };

  const all = await brandService.list();
  const sortByUpdated = (a: BrandProfile, b: BrandProfile) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  const userProfiles = all
    .filter((b) => b.ownerId === user.sub)
    .map(brandToProfile)
    .sort(sortByUpdated);
  const orphanedProfiles = all
    .filter((b) => !b.ownerId)
    .map(brandToProfile)
    .sort(sortByUpdated);

  return { profiles: userProfiles, orphaned: orphanedProfiles };
}

/**
 * Get a brand profile by ID (public, for API routes)
 * Does not require authentication - used by consumer apps
 */
export async function getBrandProfilePublic(
  id: string,
): Promise<BrandProfile | null> {
  try {
    const brand = await brandService.get(id);
    return brand ? brandToProfile(brand) : null;
  } catch (err) {
    console.error("Failed to get brand profile:", err);
    return null;
  }
}

/**
 * Delete a specific demo from a brand profile
 */
export async function deleteBrandDemo(
  id: string,
  demoType: "earn" | "checkouts" | "wallet" | "remittance",
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const brand = await brandService.get(id);
    if (!brand) {
      return { success: false, error: "Brand profile not found" };
    }
    if (brand.ownerId && brand.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const demoColumn = ({
      earn: "demoEarnId",
      checkouts: "demoCheckoutsId",
      wallet: "demoWalletId",
      remittance: "demoRemittanceId",
    } as const)[demoType];
    const demoId = brand[demoColumn];
    if (!demoId) {
      return { success: false, error: `${demoType} demo not found` };
    }

    await deleteBrandDemoConfigs({ [demoType]: demoId });
    const updated = await brandService.update(id, { [demoColumn]: null });

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: brandToProfile(updated) };
  } catch (err) {
    console.error("Failed to delete demo:", err);
    return { success: false, error: "Failed to delete demo" };
  }
}

/**
 * Create missing demos for an existing brand profile
 * Used when a brand was created before all demo types were supported
 */
export async function createMissingDemos(
  id: string,
  demoTypes: {
    earn?: boolean;
    checkouts?: boolean;
    wallet?: boolean;
    remittance?: boolean;
  },
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const brand = await brandService.get(id);
    if (!brand) {
      return { success: false, error: "Brand profile not found" };
    }
    if (brand.ownerId && brand.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const profile = brandToProfile(brand);
    const createOptions = {
      earn: demoTypes.earn && !profile.demos.earn,
      checkouts: demoTypes.checkouts && !profile.demos.checkouts,
      wallet: demoTypes.wallet && !profile.demos.wallet,
      remittance: demoTypes.remittance && !profile.demos.remittance,
    };

    const createdDemos = await createBrandDemoConfigs(
      profile.id,
      profile.name,
      profile.brand,
      user.sub,
      createOptions,
    );

    const merged = { ...profile.demos, ...createdDemos };
    const updated = await brandService.update(
      id,
      demosToUpdateInput(merged),
    );

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: brandToProfile(updated) };
  } catch (err) {
    console.error("Failed to create missing demos:", err);
    return { success: false, error: "Failed to create missing demos" };
  }
}
