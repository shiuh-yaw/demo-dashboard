"use server";

/**
 * Prospect Profile Server Actions
 *
 * Server-side actions for Prospect Profile CRUD operations.
 * Authenticates via Dynamic JWT cookie.
 *
 * Prospect profiles store unified branding settings that are applied
 * across all demo types (Earn, Checkouts, Wallet, Remittance).
 *
 * Phase 2-brand-cutover (2026-05-06): prospect-row persistence routes
 * through `services.prospects.*` (Postgres when USE_POSTGRES_PROSPECTS=true,
 * Redis otherwise). The demo-config side-effects (auto-create /
 * update-theme / delete-with-prospect) also route through
 * `services.demoConfigs.*` (Postgres when USE_POSTGRES_DEMO_CONFIGS=true,
 * Redis otherwise) as of the prospect-auto-demo-write-postgres fix — the
 * deferred "PR 2-others" work from the original cutover comment. Without
 * this, prospect-created demos landed in the legacy per-type Redis keyspace
 * while the public widget read path (post-PR #101) only checked the
 * unified store, producing 404s for every prospect-auto-created demo.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeLogoUrl } from "@/lib/normalize-logo";
import { prospectService, services } from "@/lib/services";
import {
  prospectToProfile,
  createRequestToInput,
  demosToUpdateInput,
  updateRequestToInput,
} from "@/lib/services/prospect-mapper";
import type {
  ProspectProfile,
  ProspectSettings,
  ProspectTheme,
  CreateProspectProfileRequest,
  UpdateProspectProfileRequest,
} from "@/lib/types/dashboard";
import {
  DEFAULT_PROSPECT_SETTINGS,
  DEFAULT_EARN_CONFIG,
  DEFAULT_WALLET_CONFIG,
  DEFAULT_REMITTANCE_CONFIG,
} from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widget-config";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create demo configs for a prospect profile
 * Returns the IDs of created configs
 */
async function createProspectDemoConfigs(
  prospectId: string,
  prospectName: string,
  prospect: ProspectSettings,
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

  // Create Earn config with prospect settings
  if (createEarn) {
    const theme: Partial<ProspectTheme> = prospect.theme || {};
    const earnConfigPayload = {
      theme: {
        ...DEFAULT_EARN_CONFIG.theme,
        primaryColor: prospect.primaryColor,
        accentColor: prospect.accentColor || prospect.primaryColor,
        primaryHoverColor: theme.primaryHoverColor || prospect.primaryColor,
        borderRadius: prospect.borderRadius,
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
        logo: prospect.logo === "custom" ? "custom" : "dynamic",
        logoUrl: prospect.logoUrl,
      },
      layout: DEFAULT_EARN_CONFIG.layout,
    };
    const record = await services.demoConfigs.create({
      kind: "earn",
      ownerId,
      name: `${prospectName} - Earn`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      themeOverrides: null,
      config: earnConfigPayload as unknown as Record<string, unknown>,
    });
    demos.earn = record.id;
  }

  // Create Checkouts config with prospect settings
  if (createCheckouts) {
    const theme: Partial<ProspectTheme> = prospect.theme || {};
    const checkoutConfigPayload = {
      ...DEFAULT_WIDGET_CONFIG,
      theme: {
        ...DEFAULT_WIDGET_CONFIG.theme,
        primaryColor: prospect.primaryColor,
        accentColor: prospect.accentColor || prospect.primaryColor,
        borderRadius: prospect.borderRadius || "md",
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
        logo: prospect.logo === "custom" ? prospect.logoUrl : undefined,
      },
      // Round-trip the checkout mode through the unified store —
      // `checkoutMapper.toStored` reads this field back as the
      // `mode` on the response shape (default "payment").
      _checkoutMode: "payment" as const,
    };
    const record = await services.demoConfigs.create({
      kind: "checkout",
      ownerId,
      name: `${prospectName} - Checkouts`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      themeOverrides: null,
      config: checkoutConfigPayload as unknown as Record<string, unknown>,
    });
    demos.checkouts = record.id;
  }

  // Create Wallet config with prospect settings
  if (createWallet) {
    const theme: Partial<ProspectTheme> = prospect.theme || {};
    const walletConfigPayload = {
      theme: {
        ...DEFAULT_WALLET_CONFIG.theme,
        primaryColor: prospect.primaryColor,
        primaryHoverColor:
          theme.primaryHoverColor ||
          DEFAULT_WALLET_CONFIG.theme?.primaryHoverColor,
        accentColor: prospect.accentColor || prospect.primaryColor,
        borderRadius: prospect.borderRadius,
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
        logo: prospect.logo === "custom" ? prospect.logoUrl : undefined,
        showPoweredBy: true,
      },
    };
    const record = await services.demoConfigs.create({
      kind: "wallet",
      ownerId,
      name: `${prospectName} - Wallet`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      themeOverrides: null,
      config: walletConfigPayload as unknown as Record<string, unknown>,
    });
    demos.wallet = record.id;
  }

  // Create Remittance config with prospect settings
  if (createRemittance) {
    // Carry the full prospect theme through to the remittance config so
    // pageBackground / surface / foreground / muted / border / etc.
    // flow into the remittance app's `<ThemeStyleTag>` overrides. Until
    // this widening, remittance only got primary + secondary and every
    // other token snapped back to the static defaults in globals.css.
    const remittanceTheme: Partial<ProspectTheme> = prospect.theme || {};
    const remittanceConfigPayload = {
      theme: {
        ...DEFAULT_REMITTANCE_CONFIG.theme,
        primaryColor: prospect.primaryColor,
        primaryHoverColor: remittanceTheme.primaryHoverColor,
        accentColor: prospect.accentColor || prospect.primaryColor,
        secondaryColor: prospect.accentColor || prospect.primaryColor,
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
        logoUrl: prospect.logo === "custom" ? prospect.logoUrl : undefined,
      },
    };
    const record = await services.demoConfigs.create({
      kind: "remittance",
      ownerId,
      name: `${prospectName} - Remittance`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      themeOverrides: null,
      config: remittanceConfigPayload as unknown as Record<string, unknown>,
    });
    demos.remittance = record.id;
  }

  return demos;
}

/**
 * Update demo configs when prospect settings change
 */
async function updateProspectDemoConfigs(
  profile: ProspectProfile,
  prospect: ProspectSettings,
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
      const theme: Partial<ProspectTheme> = prospect.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
          primaryColor: prospect.primaryColor,
          accentColor: prospect.accentColor || prospect.primaryColor,
          primaryHoverColor: theme.primaryHoverColor || prospect.primaryColor,
          borderRadius: prospect.borderRadius,
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
          logo: prospect.logo === "custom" ? "custom" : "dynamic",
          logoUrl: prospect.logoUrl,
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
      const theme: Partial<ProspectTheme> = prospect.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
          primaryColor: prospect.primaryColor,
          accentColor: prospect.accentColor || prospect.primaryColor,
          borderRadius: prospect.borderRadius || "md",
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
          logo: prospect.logo === "custom" ? prospect.logoUrl : undefined,
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
      const theme: Partial<ProspectTheme> = prospect.theme || {};
      const updatedConfig = {
        ...existingConfig,
        theme: {
          ...existingTheme,
          primaryColor: prospect.primaryColor,
          primaryHoverColor:
            theme.primaryHoverColor ||
            (existingTheme.primaryHoverColor as string | undefined),
          accentColor: prospect.accentColor || prospect.primaryColor,
          borderRadius: prospect.borderRadius,
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
          logo: prospect.logo === "custom" ? prospect.logoUrl : undefined,
        },
      };
      await services.demoConfigs.update(profile.demos.wallet, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Remittance config if it exists. Carry the full prospect theme
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
      const remittanceTheme: Partial<ProspectTheme> = prospect.theme || {};
      const updatedConfig = {
        theme: {
          ...existingTheme,
          primaryColor: prospect.primaryColor,
          primaryHoverColor: remittanceTheme.primaryHoverColor,
          accentColor: prospect.accentColor || prospect.primaryColor,
          secondaryColor: prospect.accentColor || prospect.primaryColor,
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
          logoUrl: prospect.logo === "custom" ? prospect.logoUrl : undefined,
        },
      };
      await services.demoConfigs.update(profile.demos.remittance, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }
}

/**
 * Delete demo configs associated with a prospect profile.
 *
 * Prospect rows can point at demo ids that no longer exist in
 * `services.demoConfigs` — e.g. records written via the pre-PR-#104
 * legacy Redis path that never made it into Postgres, or demos already
 * deleted out-of-band. The service's `delete` contract throws on
 * missing ids (see `demo-configs.parity.test.ts`), so we existence-check
 * here to keep prospect deletion idempotent.
 *
 * We deliberately don't kind-check — if a stale id somehow points at a
 * different kind, the prospect row was already misconfigured and cleaning
 * up the orphan reference is the desired end state.
 */
async function deleteProspectDemoConfigs(demos: {
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
 * Create a new prospect profile
 */
export async function createProspectProfile(
  request: CreateProspectProfileRequest,
): Promise<ActionResult<ProspectProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    // 0) Normalize the custom logo at intake (trim padding, re-encode as a
    //    data URI) so every demo config derived from this prospect renders a
    //    consistently-sized mark. Best-effort — falls back to the raw URL.
    if (request.prospect?.logoUrl) {
      request = {
        ...request,
        prospect: {
          ...request.prospect,
          logoUrl: await normalizeLogoUrl(request.prospect.logoUrl),
        },
      };
    }

    // 1) Create the canonical Prospect row first so the id is stable.
    const createdById =
      (await services.users.resolveByDynamicIds([user.sub])).get(user.sub)
        ?.id ?? null;
    const created = await prospectService.create(
      createRequestToInput(user.sub, createdById, request),
    );

    // 2) Build the ProspectSettings the demo-config orchestration expects.
    const merged: ProspectSettings = {
      ...DEFAULT_PROSPECT_SETTINGS,
      ...request.prospect,
    };

    // 3) Spin up the demo configs in Redis (unchanged orchestration).
    const demos = await createProspectDemoConfigs(
      created.id,
      created.name,
      merged,
      user.sub,
      request.generateDemos,
    );

    // 4) Persist the demo-config ids back onto the prospect row so the
    //    ProspectProfile aggregate stays self-contained.
    const finalRow = await prospectService.update(
      created.id,
      demosToUpdateInput(demos),
    );

    revalidatePath("/");
    revalidatePath("/prospects");

    return { success: true, data: prospectToProfile(finalRow) };
  } catch (err) {
    console.error("Failed to create prospect profile:", err);
    return { success: false, error: "Failed to create prospect profile" };
  }
}

/**
 * Get a prospect profile by ID
 */
export async function getProspectProfile(
  id: string,
): Promise<ActionResult<ProspectProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (prospect.ownerId && prospect.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }
    return { success: true, data: prospectToProfile(prospect) };
  } catch (err) {
    console.error("Failed to get prospect profile:", err);
    return { success: false, error: "Failed to get prospect profile" };
  }
}

/**
 * Update an existing prospect profile
 */
export async function updateProspectProfile(
  id: string,
  request: UpdateProspectProfileRequest,
): Promise<ActionResult<ProspectProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const existing = await prospectService.get(id);
    if (!existing) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (existing.ownerId && existing.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    // Normalize the custom logo at intake (trim padding, re-encode as a
    // data URI). Best-effort — falls back to the raw URL on any failure.
    if (request.prospect?.logoUrl) {
      request = {
        ...request,
        prospect: {
          ...request.prospect,
          logoUrl: await normalizeLogoUrl(request.prospect.logoUrl),
        },
      };
    }

    // Persist the prospect-row changes first so demo-config updates see
    // the new theme.
    const data = updateRequestToInput(request);
    let updated = await prospectService.update(id, data);

    // Claim orphan rows by patching ownerId. UpdateProspectInput
    // intentionally doesn't expose ownerId — only this code path needs
    // to mutate it, so we route through upsertWithId which overwrites
    // every column. We project from the fresh `updated` row to keep
    // every field consistent.
    if (!existing.ownerId && user.sub) {
      updated = await prospectService.upsertWithId(updated.id, {
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
    const merged: ProspectSettings = {
      ...DEFAULT_PROSPECT_SETTINGS,
      ...request.prospect,
    };
    await updateProspectDemoConfigs(prospectToProfile(updated), merged);

    revalidatePath("/");
    revalidatePath("/prospects");
    revalidatePath(`/prospects/${id}`);

    return { success: true, data: prospectToProfile(updated) };
  } catch (err) {
    console.error("Failed to update prospect profile:", err);
    return { success: false, error: "Failed to update prospect profile" };
  }
}

/**
 * Delete a prospect profile and its associated demo configs
 */
export async function deleteProspectProfile(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (prospect.ownerId && prospect.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    await deleteProspectDemoConfigs({
      earn: prospect.demoEarnId ?? undefined,
      checkouts: prospect.demoCheckoutsId ?? undefined,
      wallet: prospect.demoWalletId ?? undefined,
      remittance: prospect.demoRemittanceId ?? undefined,
    });
    await prospectService.delete(id);

    revalidatePath("/");
    revalidatePath("/prospects");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete prospect profile:", err);
    return { success: false, error: "Failed to delete prospect profile" };
  }
}

/**
 * Fetches all prospect profiles for the current user and orphaned profiles
 *
 * @returns Object with user's profiles and orphaned profiles, sorted by updatedAt descending
 */
export async function getAllProspectProfiles(): Promise<{
  profiles: ProspectProfile[];
  orphaned: ProspectProfile[];
}> {
  const user = await getCurrentUser();
  if (!user) return { profiles: [], orphaned: [] };

  const all = await prospectService.list();
  const sortByUpdated = (a: ProspectProfile, b: ProspectProfile) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  const userProfiles = all
    .filter((b) => b.ownerId === user.sub)
    .map(prospectToProfile)
    .sort(sortByUpdated);
  const orphanedProfiles = all
    .filter((b) => !b.ownerId)
    .map(prospectToProfile)
    .sort(sortByUpdated);

  return { profiles: userProfiles, orphaned: orphanedProfiles };
}

/**
 * Appearance fields carried per option so the picker's consuming editor can
 * prefill the Appearance section on selection without a second round trip.
 * Mirrors AppearanceTheme's field names (apps/dashboard/src/components/shared/appearance-form.tsx).
 */
export interface ProspectOptionTheme {
  logoUrl: string | null;
  primaryColor: string;
  primaryHoverColor: string | null;
  accentColor: string | null;
  pageBackground: string | null;
  background: string | null;
  foreground: string | null;
  mutedTextColor: string | null;
  borderColor: string | null;
  rowBackground: string | null;
  rowHoverBackground: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
  borderRadius: string | null;
}

/** Minimal shape for the prospect picker (GTM-03.5B) - full curation UX is Phase 07's. */
export interface ProspectOption {
  id: string;
  name: string;
  /** True when the current user created this prospect - drives the "My prospects" grouping. */
  isMine: boolean;
  /** companyUrl, for the row's ProspectIcon favicon; null when the prospect has none. */
  domain: string | null;
  theme: ProspectOptionTheme;
}

/**
 * List prospects for the config-form prospect picker. Workspace-shared
 * visibility (DESIGN.md decision 10) - every signed-in user sees every
 * prospect, not just their own; "mine" only changes the grouping, not the
 * membership.
 */
export async function listProspectOptions(): Promise<
  ActionResult<ProspectOption[]>
> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const currentUserId =
      (await services.users.resolveByDynamicIds([user.sub])).get(user.sub)
        ?.id ?? null;
    const all = await prospectService.list();
    const options = all
      .map((p) => ({
        id: p.id,
        name: p.name,
        isMine: p.createdById
          ? p.createdById === currentUserId
          : p.ownerId === user.sub,
        domain: p.companyUrl,
        theme: {
          logoUrl: p.logoUrl,
          primaryColor: p.primaryColor,
          primaryHoverColor: p.primaryHoverColor,
          accentColor: p.accentColor,
          pageBackground: p.pageBackground,
          background: p.background,
          foreground: p.foreground,
          mutedTextColor: p.mutedTextColor,
          borderColor: p.borderColor,
          rowBackground: p.rowBackground,
          rowHoverBackground: p.rowHoverBackground,
          gradientFrom: p.gradientFrom,
          gradientTo: p.gradientTo,
          borderRadius: p.borderRadius,
        },
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, data: options };
  } catch (err) {
    console.error("Failed to list prospects:", err);
    return { success: false, error: "Failed to list prospects" };
  }
}

/**
 * Get a prospect profile by ID (public, for API routes)
 * Does not require authentication - used by consumer apps
 */
export async function getProspectProfilePublic(
  id: string,
): Promise<ProspectProfile | null> {
  try {
    const prospect = await prospectService.get(id);
    return prospect ? prospectToProfile(prospect) : null;
  } catch (err) {
    console.error("Failed to get prospect profile:", err);
    return null;
  }
}

/**
 * Delete a specific demo from a prospect profile
 */
export async function deleteProspectDemo(
  id: string,
  demoType: "earn" | "checkouts" | "wallet" | "remittance",
): Promise<ActionResult<ProspectProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (prospect.ownerId && prospect.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const demoColumn = ({
      earn: "demoEarnId",
      checkouts: "demoCheckoutsId",
      wallet: "demoWalletId",
      remittance: "demoRemittanceId",
    } as const)[demoType];
    const demoId = prospect[demoColumn];
    if (!demoId) {
      return { success: false, error: `${demoType} demo not found` };
    }

    await deleteProspectDemoConfigs({ [demoType]: demoId });
    const updated = await prospectService.update(id, { [demoColumn]: null });

    revalidatePath("/");
    revalidatePath("/prospects");
    revalidatePath(`/prospects/${id}`);

    return { success: true, data: prospectToProfile(updated) };
  } catch (err) {
    console.error("Failed to delete demo:", err);
    return { success: false, error: "Failed to delete demo" };
  }
}

/**
 * Create missing demos for an existing prospect profile
 * Used when a prospect was created before all demo types were supported
 */
export async function createMissingDemos(
  id: string,
  demoTypes: {
    earn?: boolean;
    checkouts?: boolean;
    wallet?: boolean;
    remittance?: boolean;
  },
): Promise<ActionResult<ProspectProfile>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (prospect.ownerId && prospect.ownerId !== user.sub) {
      return { success: false, error: "Access denied" };
    }

    const profile = prospectToProfile(prospect);
    const createOptions = {
      earn: demoTypes.earn && !profile.demos.earn,
      checkouts: demoTypes.checkouts && !profile.demos.checkouts,
      wallet: demoTypes.wallet && !profile.demos.wallet,
      remittance: demoTypes.remittance && !profile.demos.remittance,
    };

    const createdDemos = await createProspectDemoConfigs(
      profile.id,
      profile.name,
      profile.prospect,
      user.sub,
      createOptions,
    );

    const merged = { ...profile.demos, ...createdDemos };
    const updated = await prospectService.update(
      id,
      demosToUpdateInput(merged),
    );

    revalidatePath("/");
    revalidatePath("/prospects");
    revalidatePath(`/prospects/${id}`);

    return { success: true, data: prospectToProfile(updated) };
  } catch (err) {
    console.error("Failed to create missing demos:", err);
    return { success: false, error: "Failed to create missing demos" };
  }
}
