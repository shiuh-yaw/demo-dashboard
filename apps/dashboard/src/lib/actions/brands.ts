"use server";

/**
 * Brand Profile Server Actions
 *
 * Server-side actions for Brand Profile CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Brand profiles store unified branding settings that are applied
 * across all demo types (Earn, Checkouts, Wallet).
 */

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  BrandProfile,
  BrandSettings,
  BrandTheme,
  CreateBrandProfileRequest,
  UpdateBrandProfileRequest,
  StoredEarnConfig,
  StoredCheckoutConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";
import {
  DEFAULT_BRAND_SETTINGS,
  DEFAULT_EARN_CONFIG,
  DEFAULT_WALLET_CONFIG,
} from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widget-config";

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
  options?: { earn?: boolean; checkouts?: boolean; wallet?: boolean },
): Promise<{ earn?: string; checkouts?: string; wallet?: string }> {
  const redis = getRedis();
  const now = new Date().toISOString();
  const demos: { earn?: string; checkouts?: string; wallet?: string } = {};

  // Create demos only if explicitly requested (or all if no options provided)
  const createAll = !options || Object.keys(options).length === 0;
  const createEarn = createAll || options?.earn === true;
  const createCheckouts = createAll || options?.checkouts === true;
  const createWallet = createAll || options?.wallet === true;

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
          activeTextColor: brand.accentColor || brand.primaryColor,
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
            activeTextColor: brand.accentColor || brand.primaryColor,
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
}

/**
 * Delete demo configs associated with a brand profile
 */
async function deleteBrandDemoConfigs(demos: {
  earn?: string;
  checkouts?: string;
  wallet?: string;
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
    const redis = getRedis();
    const id = createId();
    const now = new Date().toISOString();

    // Merge brand settings with defaults
    const brand: BrandSettings = {
      ...DEFAULT_BRAND_SETTINGS,
      ...request.brand,
    };

    // Create demo configs for this brand
    const demos = await createBrandDemoConfigs(
      id,
      request.name,
      brand,
      user.sub,
      request.generateDemos,
    );

    const profile: BrandProfile = {
      id,
      name: request.name || "Untitled Brand",
      companyUrl: request.companyUrl,
      brand,
      demos,
      ownerId: user.sub,
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.brandProfile(id), profile);
    await redis.sadd(REDIS_KEYS.brandProfileList, id);

    revalidatePath("/");
    revalidatePath("/brands");

    return { success: true, data: profile };
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
    const redis = getRedis();
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));

    if (!profile) {
      return { success: false, error: "Brand profile not found" };
    }

    // Check ownership (allow orphaned profiles)
    if (profile.ownerId && profile.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    return { success: true, data: profile };
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
    const redis = getRedis();
    const existing = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));

    if (!existing) {
      return { success: false, error: "Brand profile not found" };
    }

    // Check ownership (allow orphaned profiles to be claimed)
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Merge brand settings
    const brand: BrandSettings = {
      ...existing.brand,
      ...request.brand,
    };

    const updated: BrandProfile = {
      ...existing,
      name: request.name ?? existing.name,
      companyUrl: request.companyUrl ?? existing.companyUrl,
      brand,
      ownerId: existing.ownerId || user.sub, // Claim orphaned profiles
      updatedAt: new Date().toISOString(),
    };

    // Update linked demo configs with new brand settings
    await updateBrandDemoConfigs(updated, brand);

    await redis.set(REDIS_KEYS.brandProfile(id), updated);

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: updated };
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
    const redis = getRedis();
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));

    if (!profile) {
      return { success: false, error: "Brand profile not found" };
    }

    // Check ownership
    if (profile.ownerId && profile.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Delete associated demo configs
    await deleteBrandDemoConfigs(profile.demos);

    // Delete the profile
    await redis.del(REDIS_KEYS.brandProfile(id));
    await redis.srem(REDIS_KEYS.brandProfileList, id);

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

  const redis = getRedis();

  // Get all profile IDs from the list
  const profileIds = await redis.smembers(REDIS_KEYS.brandProfileList);

  if (!profileIds || profileIds.length === 0) {
    return { profiles: [], orphaned: [] };
  }

  // Fetch all profiles
  const fetchedProfiles = await Promise.all(
    profileIds.map(async (id) => {
      const profile = await redis.get<BrandProfile>(
        REDIS_KEYS.brandProfile(id),
      );
      return profile;
    }),
  );

  // Filter out nulls
  const validProfiles = fetchedProfiles.filter(
    (p): p is BrandProfile => p !== null,
  );

  // Separate user's profiles and orphaned profiles
  const userProfiles = user
    ? validProfiles.filter((p) => p.ownerId === user.sub)
    : [];
  const orphanedProfiles = validProfiles.filter((p) => !p.ownerId);

  // Sort both lists by updatedAt descending
  const sortByUpdated = (a: BrandProfile, b: BrandProfile) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  return {
    profiles: userProfiles.sort(sortByUpdated),
    orphaned: orphanedProfiles.sort(sortByUpdated),
  };
}

/**
 * Get a brand profile by ID (public, for API routes)
 * Does not require authentication - used by consumer apps
 */
export async function getBrandProfilePublic(
  id: string,
): Promise<BrandProfile | null> {
  try {
    const redis = getRedis();
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));
    return profile;
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
  demoType: "earn" | "checkouts" | "wallet",
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));

    if (!profile) {
      return { success: false, error: "Brand profile not found" };
    }

    // Check ownership
    if (profile.ownerId && profile.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const demoId = profile.demos[demoType];
    if (!demoId) {
      return { success: false, error: `${demoType} demo not found` };
    }

    // Delete the demo config
    await deleteBrandDemoConfigs({ [demoType]: demoId });

    // Update the profile
    const updatedDemos = { ...profile.demos };
    delete updatedDemos[demoType];

    const updated: BrandProfile = {
      ...profile,
      demos: updatedDemos,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEYS.brandProfile(id), updated);

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: updated };
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
  demoTypes: { earn?: boolean; checkouts?: boolean; wallet?: boolean },
): Promise<ActionResult<BrandProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const redis = getRedis();
    const profile = await redis.get<BrandProfile>(REDIS_KEYS.brandProfile(id));

    if (!profile) {
      return { success: false, error: "Brand profile not found" };
    }

    // Check ownership
    if (profile.ownerId && profile.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const now = new Date().toISOString();

    // Only create demos that don't exist and are requested
    const createOptions = {
      earn: demoTypes.earn && !profile.demos.earn,
      checkouts: demoTypes.checkouts && !profile.demos.checkouts,
      wallet: demoTypes.wallet && !profile.demos.wallet,
    };

    // Create the missing demos
    const createdDemos = await createBrandDemoConfigs(
      profile.id,
      profile.name,
      profile.brand,
      user.sub,
      createOptions,
    );

    // Merge with existing demos
    const updatedDemos = {
      ...profile.demos,
      ...createdDemos,
    };

    const updated: BrandProfile = {
      ...profile,
      demos: updatedDemos,
      updatedAt: now,
    };

    await redis.set(REDIS_KEYS.brandProfile(id), updated);

    revalidatePath("/");
    revalidatePath("/brands");
    revalidatePath(`/brands/${id}`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("Failed to create missing demos:", err);
    return { success: false, error: "Failed to create missing demos" };
  }
}
