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
 * Redis otherwise). The demo-config side-effects (auto-create /
 * update-theme / delete-with-brand) also route through
 * `services.demoConfigs.*` (Postgres when USE_POSTGRES_DEMO_CONFIGS=true,
 * Redis otherwise) as of the brand-auto-demo-write-postgres fix — the
 * deferred "PR 2-others" work from the original cutover comment. Without
 * this, brand-created demos landed in the legacy per-type Redis keyspace
 * while the public widget read path (post-PR #101) only checked the
 * unified store, producing 404s for every brand-auto-created demo.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { brandService, services } from "@/lib/services";
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
} from "@/lib/types/dashboard";
import {
  DEFAULT_BRAND_SETTINGS,
  DEFAULT_EARN_CONFIG,
  DEFAULT_WALLET_CONFIG,
  DEFAULT_REMITTANCE_CONFIG,
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
    const theme: Partial<BrandTheme> = brand.theme || {};
    const earnConfigPayload = {
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
    };
    const record = await services.demoConfigs.create({
      kind: "earn",
      ownerId,
      name: `${brandName} - Earn`,
      description: `Auto-generated from brand profile: ${brandId}`,
      brandId,
      themeOverrides: null,
      config: earnConfigPayload as unknown as Record<string, unknown>,
    });
    demos.earn = record.id;
  }

  // Create Checkouts config with brand settings
  if (createCheckouts) {
    const theme: Partial<BrandTheme> = brand.theme || {};
    const checkoutConfigPayload = {
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
      // Round-trip the checkout mode through the unified store —
      // `checkoutMapper.toStored` reads this field back as the
      // `mode` on the response shape (default "payment").
      _checkoutMode: "payment" as const,
    };
    const record = await services.demoConfigs.create({
      kind: "checkout",
      ownerId,
      name: `${brandName} - Checkouts`,
      description: `Auto-generated from brand profile: ${brandId}`,
      brandId,
      themeOverrides: null,
      config: checkoutConfigPayload as unknown as Record<string, unknown>,
    });
    demos.checkouts = record.id;
  }

  // Create Wallet config with brand settings
  if (createWallet) {
    const theme: Partial<BrandTheme> = brand.theme || {};
    const walletConfigPayload = {
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
    };
    const record = await services.demoConfigs.create({
      kind: "wallet",
      ownerId,
      name: `${brandName} - Wallet`,
      description: `Auto-generated from brand profile: ${brandId}`,
      brandId,
      themeOverrides: null,
      config: walletConfigPayload as unknown as Record<string, unknown>,
    });
    demos.wallet = record.id;
  }

  // Create Remittance config with brand settings
  if (createRemittance) {
    // Carry the full brand theme through to the remittance config so
    // pageBackground / surface / foreground / muted / border / etc.
    // flow into the remittance app's `<ThemeStyleTag>` overrides. Until
    // this widening, remittance only got primary + secondary and every
    // other token snapped back to the static defaults in globals.css.
    const remittanceTheme: Partial<BrandTheme> = brand.theme || {};
    const remittanceConfigPayload = {
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
    };
    const record = await services.demoConfigs.create({
      kind: "remittance",
      ownerId,
      name: `${brandName} - Remittance`,
      description: `Auto-generated from brand profile: ${brandId}`,
      brandId,
      themeOverrides: null,
      config: remittanceConfigPayload as unknown as Record<string, unknown>,
    });
    demos.remittance = record.id;
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
  // Update Earn config if it exists
  if (profile.demos.earn) {
    const record = await services.demoConfigs.get(profile.demos.earn);
    if (record && record.kind === "earn") {
      const existingConfig = (record.config ?? {}) as Record<string, unknown>;
      const existingTheme = (existingConfig.theme ?? {}) as Record<
        string,
        unknown
      >;
      const existingBranding = (existingConfig.branding ?? {}) as Record<
        string,
        unknown
      >;
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
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
          ...existingBranding,
          logo: brand.logo === "custom" ? "custom" : "dynamic",
          logoUrl: brand.logoUrl,
        },
      };
      await services.demoConfigs.update(profile.demos.earn, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Checkouts config if it exists
  if (profile.demos.checkouts) {
    const record = await services.demoConfigs.get(profile.demos.checkouts);
    if (record && record.kind === "checkout") {
      const existingConfig = (record.config ?? {}) as Record<string, unknown>;
      const existingTheme = (existingConfig.theme ?? {}) as Record<
        string,
        unknown
      >;
      const existingBranding = (existingConfig.branding ?? {}) as Record<
        string,
        unknown
      >;
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
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
          ...existingBranding,
          // WidgetBranding uses 'logo' as URL directly, not a type enum
          logo: brand.logo === "custom" ? brand.logoUrl : undefined,
        },
      };
      await services.demoConfigs.update(profile.demos.checkouts, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Wallet config if it exists
  if (profile.demos.wallet) {
    const record = await services.demoConfigs.get(profile.demos.wallet);
    if (record && record.kind === "wallet") {
      const existingConfig = (record.config ?? {}) as Record<string, unknown>;
      const existingTheme = (existingConfig.theme ?? {}) as Record<
        string,
        unknown
      >;
      const existingBranding = (existingConfig.branding ?? {}) as Record<
        string,
        unknown
      >;
      const theme: Partial<BrandTheme> = brand.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
          primaryColor: brand.primaryColor,
          primaryHoverColor:
            theme.primaryHoverColor ||
            (existingTheme.primaryHoverColor as string | undefined),
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
          ...existingBranding,
          // WalletBranding uses 'logo' as URL directly (like Checkouts)
          logo: brand.logo === "custom" ? brand.logoUrl : undefined,
        },
      };
      await services.demoConfigs.update(profile.demos.wallet, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Remittance config if it exists. Carry the full brand theme
  // through so the remittance app receives pageBackground / surface /
  // foreground / muted / border / row* / gradient* — not just primary
  // + secondary like it used to.
  if (profile.demos.remittance) {
    const record = await services.demoConfigs.get(profile.demos.remittance);
    if (record && record.kind === "remittance") {
      const existingConfig = (record.config ?? {}) as Record<string, unknown>;
      const existingTheme = (existingConfig.theme ?? {}) as Record<
        string,
        unknown
      >;
      const remittanceTheme: Partial<BrandTheme> = brand.theme || {};
      const updatedConfig = {
        theme: {
          ...existingTheme,
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
      };
      await services.demoConfigs.update(profile.demos.remittance, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }
}

/**
 * Delete demo configs associated with a brand profile.
 *
 * Brand rows can point at demo ids that no longer exist in
 * `services.demoConfigs` — e.g. records written via the pre-PR-#104
 * legacy Redis path that never made it into Postgres, or demos already
 * deleted out-of-band. The service's `delete` contract throws on
 * missing ids (see `demo-configs.parity.test.ts`), so we existence-check
 * here to keep brand deletion idempotent.
 *
 * We deliberately don't kind-check — if a stale id somehow points at a
 * different kind, the brand row was already misconfigured and cleaning
 * up the orphan reference is the desired end state.
 */
async function deleteBrandDemoConfigs(demos: {
  earn?: string;
  checkouts?: string;
  wallet?: string;
  remittance?: string;
}): Promise<void> {
  const ids = [demos.earn, demos.checkouts, demos.wallet, demos.remittance]
    .filter((id): id is string => Boolean(id));
  for (const id of ids) {
    const existing = await services.demoConfigs.get(id);
    if (existing) await services.demoConfigs.delete(id);
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
