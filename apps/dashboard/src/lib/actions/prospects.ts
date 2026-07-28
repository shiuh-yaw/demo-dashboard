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
 * Prospect-row persistence routes through `services.prospects.*`; the
 * demo-config side-effects (auto-create / update-theme /
 * delete-with-prospect) route through `services.demoConfigs.*`. Both are
 * Postgres-backed. `demos` is never stored on the Prospect row - it is
 * resolved from `DemoConfig.prospectId` via `resolveProspectDemos` /
 * `resolveProspectDemosBatch` (see `@/lib/services/prospect-demos`).
 */

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { type ProspectScope } from "@/lib/prospect-scope";
import {
  getSessionUser,
  canMutateProspect,
  canReassignProspect,
  canViewProspect,
  visibleProspectIds,
  prospectScopeWhere,
  prospectVisibilityWhere,
  resolveActiveScope,
  membershipsForUserCached,
} from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { normalizeLogoUrl } from "@/lib/normalize-logo";
import { extractThemeFromUrl } from "@/lib/actions/extract-theme";
import { prospectService, services } from "@/lib/services";
import type { GtmUser, Page, Prospect, Team } from "@/lib/services";
import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import type {
  OverviewEngagement,
  UpdateProspectInput,
} from "@/lib/services/types";
import { toOverviewRow, type OverviewProspectRow } from "@/lib/overview-row";
import {
  resolveProspectDemos,
  resolveProspectDemosBatch,
  type ProspectDemoMap,
} from "@/lib/services/prospect-demos";
import type { AdminUserView } from "@/lib/actions/team-views";
import type { WidgetTheme, WidgetBranding } from "@/lib/widget-config";
import {
  prospectToProfile,
  createRequestToInput,
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
  DEFAULT_TRADE_CONFIG,
  DEFAULT_FLOW_CONFIG,
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
    checkout?: boolean;
    wallet?: boolean;
    remittance?: boolean;
    trade?: boolean;
    flow?: boolean;
  },
): Promise<ProspectDemoMap> {
  const demos: ProspectDemoMap = {};

  // Create demos only if explicitly requested (or all if no options provided)
  const createAll = !options || Object.keys(options).length === 0;
  const createEarn = createAll || options?.earn === true;
  const createCheckouts = createAll || options?.checkout === true;
  const createWallet = createAll || options?.wallet === true;
  const createRemittance = createAll || options?.remittance === true;
  const createTrade = createAll || options?.trade === true;
  const createFlow = createAll || options?.flow === true;

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
      isPrimary: true,
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
      isPrimary: true,
      themeOverrides: null,
      config: checkoutConfigPayload as unknown as Record<string, unknown>,
    });
    demos.checkout = record.id;
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
      isPrimary: true,
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
      isPrimary: true,
      themeOverrides: null,
      config: remittanceConfigPayload as unknown as Record<string, unknown>,
    });
    demos.remittance = record.id;
  }

  // Create Trade config with prospect branding (no theme editor for trade)
  if (createTrade) {
    const tradeConfigPayload = {
      ...DEFAULT_TRADE_CONFIG,
      branding: {
        ...DEFAULT_TRADE_CONFIG.branding,
        appName: prospectName,
        logoUrl: prospect.logo === "custom" ? prospect.logoUrl : undefined,
      },
    };
    const record = await services.demoConfigs.create({
      kind: "trade",
      ownerId,
      name: `${prospectName} - Trade`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      isPrimary: true,
      themeOverrides: null,
      config: tradeConfigPayload as unknown as Record<string, unknown>,
    });
    demos.trade = record.id;
  }

  // Create Flow config with prospect theme + branding
  if (createFlow) {
    const flowTheme: Partial<ProspectTheme> = prospect.theme || {};
    const flowConfigPayload = {
      ...DEFAULT_FLOW_CONFIG,
      theme: {
        ...DEFAULT_FLOW_CONFIG.theme,
        primaryColor: prospect.primaryColor,
        primaryHoverColor:
          flowTheme.primaryHoverColor ||
          DEFAULT_FLOW_CONFIG.theme?.primaryHoverColor,
        accentColor: prospect.accentColor || prospect.primaryColor,
      },
      branding: {
        ...DEFAULT_FLOW_CONFIG.branding,
        appName: prospectName,
        logoUrl: prospect.logo === "custom" ? prospect.logoUrl : undefined,
      },
    };
    const record = await services.demoConfigs.create({
      kind: "flow",
      ownerId,
      name: `${prospectName} - Flow`,
      description: `Auto-generated from prospect profile: ${prospectId}`,
      prospectId,
      isPrimary: true,
      themeOverrides: null,
      config: flowConfigPayload as unknown as Record<string, unknown>,
    });
    demos.flow = record.id;
  }

  return demos;
}

/**
 * Update demo configs when prospect settings change. `demos` is the
 * caller's fresh `resolveProspectDemos` read, not a stored column - only
 * the four kinds with theme-sync logic below are consulted.
 */
async function updateProspectDemoConfigs(
  demos: ProspectDemoMap,
  prospect: ProspectSettings,
): Promise<void> {
  // Update Earn config if it exists
  if (demos.earn) {
    const record = await services.demoConfigs.get(demos.earn);
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
      await services.demoConfigs.update(demos.earn, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Checkouts config if it exists
  if (demos.checkout) {
    const record = await services.demoConfigs.get(demos.checkout);
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
      await services.demoConfigs.update(demos.checkout, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Wallet config if it exists
  if (demos.wallet) {
    const record = await services.demoConfigs.get(demos.wallet);
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
      await services.demoConfigs.update(demos.wallet, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }

  // Update Remittance config if it exists. Carry the full prospect theme
  // through so the remittance app receives pageBackground / surface /
  // foreground / muted / border / row* / gradient* — not just primary
  // + secondary like it used to.
  if (demos.remittance) {
    const record = await services.demoConfigs.get(demos.remittance);
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
      await services.demoConfigs.update(demos.remittance, {
        config: updatedConfig as unknown as Record<string, unknown>,
      });
    }
  }
}

/**
 * Delete every resolved demo config for a prospect - every kind, not just
 * the four legacy auto-generated ones. `DemoConfig.prospectId` already
 * cascades on Prospect delete at the DB level; this explicit pass runs
 * first so this function stays idempotent (re-runnable) and callers that
 * only remove a subset of demos (`deleteProspectDemo`) share the same
 * existence-checked deletion path.
 *
 * Ids can point at demo configs that no longer exist (already deleted
 * out-of-band). The service's `delete` contract throws on missing ids
 * (see `demo-configs.postgres.test.ts`), so we existence-check here to
 * keep deletion idempotent.
 */
async function deleteProspectDemoConfigs(demos: ProspectDemoMap): Promise<void> {
  const ids = Object.values(demos).filter((id): id is string => Boolean(id));
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
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }
  if (!canCreateRecord(user)) {
    return { success: false, error: "Access denied" };
  }

  try {
    // Persist name + website immediately; branding is derived in the
    // background so the row appears at once. Demos are added later from the
    // prospect hub, never at create time.
    const ownerId = user.dynamicUserId ?? "";
    const website = request.companyUrl?.trim();
    const created = await prospectService.create(
      createRequestToInput(ownerId, user.id, request),
    );

    // Best-effort branding import off the website, non-blocking (Next
    // `after()`). Failure is swallowed - the prospect stays valid without
    // branding. Skipped entirely when no website was supplied.
    if (website) {
      after(async () => {
        try {
          const res = await extractThemeFromUrl(website);
          if (!res.success || !res.data) return;
          const update = await extractedToProspectUpdate(res.data);
          if (Object.keys(update).length === 0) return;
          await prospectService.update(created.id, update);
          revalidatePath("/dashboard");
          revalidatePath("/dashboard/prospects");
          revalidatePath(`/dashboard/prospects/${created.id}`);
        } catch (err) {
          console.error(
            "[prospect-create:theme-import] background import failed",
            err,
          );
        }
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/prospects");

    return { success: true, data: prospectToProfile(created) };
  } catch (err) {
    console.error("Failed to create prospect profile:", err);
    return { success: false, error: "Failed to create prospect profile" };
  }
}

/**
 * Map an `extractThemeFromUrl` result onto a prospect-row update: derived
 * logo (normalized, best-effort) plus every color/radius token the extractor
 * returned. Only defined fields are written so a partial extraction never
 * blanks existing columns.
 */
async function extractedToProspectUpdate(data: {
  theme: Partial<WidgetTheme>;
  branding: Partial<WidgetBranding>;
}): Promise<UpdateProspectInput> {
  const t = data.theme;
  const update: UpdateProspectInput = {};
  const logo = data.branding.logo;
  if (logo) {
    update.logo = "custom";
    update.logoUrl = await normalizeLogoUrl(logo);
  }
  const set = (key: keyof UpdateProspectInput, value: string | undefined) => {
    if (value) (update as Record<string, unknown>)[key] = value;
  };
  set("primaryColor", t.primaryColor);
  set("primaryHoverColor", t.primaryHoverColor);
  set("accentColor", t.accentColor);
  set("pageBackground", t.pageBackground);
  set("background", t.background);
  set("foreground", t.foreground);
  set("mutedTextColor", t.mutedTextColor);
  set("borderColor", t.borderColor);
  set("rowBackground", t.rowBackground);
  set("rowHoverBackground", t.rowHoverBackground);
  set("gradientFrom", t.gradientFrom);
  set("gradientTo", t.gradientTo);
  set("borderRadius", t.borderRadius);
  return update;
}

/**
 * Request-scoped memoization of the prospect row read - the hub layout and
 * every segment page under it call `getProspectProfile` for the same id in
 * one request. Not exported (this file is "use server"): a private helper
 * here is a plain function, never a server action. Per-request only, via
 * React `cache()` - never a cross-request cache.
 */
const getCachedProspectRecord = cache((id: string) => prospectService.get(id));

/**
 * Raw prospect row for a resolved id, request-memoized - exposes
 * `getCachedProspectRecord` to callers outside this module (e.g. the hub
 * layout guard) that need raw columns `ProspectProfile` doesn't carry
 * (`status`, `domain`), so they hit the same cached read instead of issuing
 * their own `prospectService.get(id)` call for a row this module already
 * fetched this request.
 */
export async function getCachedProspect(id: string): Promise<Prospect | null> {
  return getCachedProspectRecord(id);
}

/**
 * Resolves the prospect's current owner as a User.id for the Ownership
 * select: `createdById` when set, else the User whose `dynamicUserId`
 * matches the legacy `ownerId` (unclaimed rows). Null when neither resolves
 * (e.g. an orphaned row with `ownerId: ""`, or a sub with no matching User).
 */
async function resolveOwnerId(
  prospect: Pick<Prospect, "createdById" | "ownerId">,
): Promise<string | null> {
  if (prospect.createdById) return prospect.createdById;
  if (!prospect.ownerId) return null;
  const resolved = await services.users.resolveByDynamicIds([prospect.ownerId]);
  return resolved.get(prospect.ownerId)?.id ?? null;
}

/**
 * `prospectToProfile` plus the resolved current-owner id (see
 * `resolveOwnerId`) and the resolved per-kind demo map (see
 * `resolveProspectDemos`) - demos are never a row column.
 */
async function toResolvedProfile(prospect: Prospect): Promise<ProspectProfile> {
  const [resolvedOwnerId, demos] = await Promise.all([
    resolveOwnerId(prospect),
    resolveProspectDemos(prospect.id),
  ]);
  return {
    ...prospectToProfile(prospect),
    demos,
    resolvedOwnerId,
  };
}

/**
 * Full profile resolution (auth + visibility + owner/demos resolve),
 * request-memoized via `React.cache()` so the hub layout and every segment
 * page under it - each of which calls `getProspectProfile` for the same id -
 * resolve it exactly once per request instead of re-running the auth check,
 * visibility query, and owner/demos resolve per segment. Per-request only -
 * never a cross-request cache. Returns null for "not found" and "not
 * visible" alike (same not-found shape, no existence oracle); throws on
 * unexpected errors, which `getProspectProfile` below catches into the
 * ActionResult shape.
 */
const getResolvedProspectProfile = cache(
  async (id: string): Promise<ProspectProfile | null> => {
    const user = await getSessionUser();
    if (!user) return null;
    const prospect = await getCachedProspectRecord(id);
    if (!prospect) return null;
    // Authorize the single row in memory (own + team, admin unscoped) against
    // the already-fetched record + request-cached memberships - no full
    // visible-id scan just to check one prospect.
    if (!(await canViewProspect(user, prospect))) return null;
    return toResolvedProfile(prospect);
  },
);

/**
 * Get a prospect profile by ID
 */
export async function getProspectProfile(
  id: string,
): Promise<ActionResult<ProspectProfile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const profile = await getResolvedProspectProfile(id);
    if (!profile) {
      return { success: false, error: "Prospect profile not found" };
    }
    return { success: true, data: profile };
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
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const existing = await prospectService.get(id);
    if (!existing) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!(await canMutateProspect(user, existing))) {
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
    // the new theme. Stored ownerId is never rewritten; createdById is the
    // attribution linkage.
    const data = updateRequestToInput(request);
    const updated = await prospectService.update(id, data);

    // Update demo configs using the merged settings.
    const merged: ProspectSettings = {
      ...DEFAULT_PROSPECT_SETTINGS,
      ...request.prospect,
    };
    await updateProspectDemoConfigs(await resolveProspectDemos(id), merged);

    revalidatePath("/dashboard/prospects");
    // "layout" so the hub header + breadcrumb (rendered in the hub layout)
    // and every sub-tab under this id refresh, not just the settings page.
    revalidatePath(`/dashboard/prospects/${id}`, "layout");

    return { success: true, data: await toResolvedProfile(updated) };
  } catch (err) {
    console.error("Failed to update prospect profile:", err);
    return { success: false, error: "Failed to update prospect profile" };
  }
}

/** Shown when a denied reassignment reaches the server - mirrors the disabled-state copy in ProspectSettings. */
const REASSIGN_DENIED_MESSAGE =
  "Only the current owner or an admin can reassign this prospect";

/**
 * Reassign a prospect's owner (GTM-08F Ownership section). Authorization is
 * enforced here, server-side, regardless of what the client sent: only the
 * CURRENT owner or a global ADMIN/OWNER may reassign - `createdById` drives
 * two-tier visibility (`visibleProspectIds`), so a wrong reassignment is a
 * visibility leak, not just a UI bug. The target must be an active
 * (non-deactivated) workspace user. `getSessionUser` is called inside the
 * try block (not before it) so a transient session-resolution failure
 * surfaces as this action's own specific error instead of an unhandled
 * rejection reaching the client as a generic thrown-exception toast.
 */
export async function reassignProspectOwner(
  id: string,
  userId: string,
): Promise<ActionResult<ProspectProfile>> {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return { success: false, error: "Authentication required" };
    }

    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!canReassignProspect(actor, prospect)) {
      return { success: false, error: REASSIGN_DENIED_MESSAGE };
    }

    const target = await services.users.get(userId);
    if (!target || target.deactivatedAt) {
      return { success: false, error: "Selected user is not available" };
    }

    const updated = await prospectService.update(id, { createdById: target.id });

    // Owner changes reshape visibility everywhere (switcher, lists, scope) -
    // revalidate the operator layout, plus the hub layout for this id.
    revalidatePath("/", "layout");
    revalidatePath(`/dashboard/prospects/${id}`, "layout");

    return { success: true, data: await toResolvedProfile(updated) };
  } catch (err) {
    console.error("Failed to reassign prospect owner:", err);
    return { success: false, error: "Failed to reassign prospect owner" };
  }
}

/**
 * Reassign a prospect's team (GTM-08F Ownership section), or clear it with
 * `teamId: null`. Same authorization as `reassignProspectOwner` - only the
 * current owner or a global ADMIN/OWNER may reassign.
 */
export async function reassignProspectTeam(
  id: string,
  teamId: string | null,
): Promise<ActionResult<ProspectProfile>> {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return { success: false, error: "Authentication required" };
    }

    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!canReassignProspect(actor, prospect)) {
      return { success: false, error: REASSIGN_DENIED_MESSAGE };
    }

    if (teamId !== null) {
      const teamsPage = await services.teams.list();
      const exists = teamsPage.items.some((t) => t.id === teamId);
      if (!exists) {
        return { success: false, error: "Selected team is not available" };
      }
    }

    const updated = await prospectService.update(id, { teamId });

    // Team changes reshape team-scoped visibility for every member of the
    // old and new team - revalidate the operator layout, plus the hub layout.
    revalidatePath("/", "layout");
    revalidatePath(`/dashboard/prospects/${id}`, "layout");

    return { success: true, data: await toResolvedProfile(updated) };
  } catch (err) {
    console.error("Failed to reassign prospect team:", err);
    return { success: false, error: "Failed to reassign prospect team" };
  }
}

/**
 * List active workspace users eligible to become a prospect's owner. Any
 * authenticated caller (not admin-gated) - a non-admin owner still needs to
 * browse candidates to hand a prospect off. Deactivated users are excluded,
 * except `currentOwnerId` (the prospect's resolved current owner, see
 * `resolveOwnerId`) - it's always included, deactivated or not, so the Owner
 * select always has an option to display the current owner rather than
 * falling back to the placeholder.
 */
export async function listAssignableUsers(
  currentOwnerId?: string | null,
): Promise<ActionResult<AdminUserView[]>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  try {
    const usersPage = await services.users.list();
    const all = usersPage.items;
    const active = all.filter((u) => !u.deactivatedAt);
    const missingCurrentOwner =
      currentOwnerId && !active.some((u) => u.id === currentOwnerId)
        ? all.find((u) => u.id === currentOwnerId)
        : undefined;
    const candidates = missingCurrentOwner
      ? [...active, missingCurrentOwner]
      : active;
    const data = candidates
      .map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        deactivated: Boolean(u.deactivatedAt),
      }))
      .sort((a, b) => (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email));
    return { success: true, data };
  } catch (err) {
    console.error("Failed to list assignable users:", err);
    return { success: false, error: "Failed to list assignable users" };
  }
}

/**
 * List teams eligible to own a prospect. Any authenticated caller.
 */
export async function listAssignableTeams(): Promise<ActionResult<Team[]>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };

  try {
    const teamsPage = await services.teams.list();
    return { success: true, data: teamsPage.items };
  } catch (err) {
    console.error("Failed to list assignable teams:", err);
    return { success: false, error: "Failed to list assignable teams" };
  }
}

/**
 * Delete a prospect profile and its associated demo configs
 */
export async function deleteProspectProfile(
  id: string,
): Promise<ActionResult<{ deleted: true }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!(await canMutateProspect(user, prospect))) {
      return { success: false, error: "Access denied" };
    }

    await deleteProspectDemoConfigs(await resolveProspectDemos(id));
    await prospectService.delete(id);

    revalidatePath("/dashboard/prospects");

    return { success: true, data: { deleted: true } };
  } catch (err) {
    console.error("Failed to delete prospect profile:", err);
    return { success: false, error: "Failed to delete prospect profile" };
  }
}

/**
 * Enforce a requested scope server-side. Fails closed: "all" only for admins,
 * "team" only for a team the user belongs to (admins bypass). Everything else
 * collapses to "mine". When no scope is passed, the scope is re-derived from
 * the persisted cookies so the UI controls are convenience only.
 */
async function enforceScope(
  user: GtmUser,
  requested: ProspectScope | undefined,
): Promise<ProspectScope> {
  if (!requested) return resolveActiveScope(user);

  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";
  const memberships = await membershipsForUserCached(user.id);
  const memberTeamIds = new Set(memberships.map((m) => m.teamId));
  const isPermittedTeam = (teamId: string) =>
    isAdmin || memberTeamIds.has(teamId);

  if (requested.kind === "all") {
    return isAdmin ? { kind: "all" } : { kind: "mine" };
  }
  if (requested.kind === "team") {
    return isPermittedTeam(requested.teamId) ? requested : { kind: "mine" };
  }
  if (requested.kind === "mine" && requested.teamId) {
    return isPermittedTeam(requested.teamId) ? requested : { kind: "mine" };
  }
  return { kind: "mine" };
}

/**
 * Fetches prospect profiles visible to the current user under the given
 * scope. Scope is always re-enforced server-side (see `enforceScope`) and
 * translated straight into a DB where-fragment - no full-list JS filter.
 * `cursor` requests the page after a previous call's `profiles.nextCursor`
 * (the infinite-scroll list's "Load more"); omit it for the first page.
 *
 * @returns `profiles`, the requested page of the scope's list (newest-updated
 *   first); `scope`, the enforced scope actually applied (echoed back so a
 *   caller can key a cache off it without re-deriving it); `orphaned`, a
 *   separate bounded (non-paginated) fetch of legacy no-owner rows,
 *   ADMIN/OWNER only, on the first page only - `cursor` pages skip it, since
 *   it never changes across a single scope's pagination.
 */
export async function getAllProspectProfiles(
  requestedScope?: ProspectScope,
  cursor?: string | null,
): Promise<{
  profiles: Page<ProspectProfile>;
  orphaned: ProspectProfile[];
  scope: ProspectScope;
}> {
  const user = await getSessionUser();
  if (!user) {
    return {
      profiles: { items: [], nextCursor: null },
      orphaned: [],
      scope: { kind: "mine" },
    };
  }

  const scope = await enforceScope(user, requestedScope);
  const page = await prospectService.list({
    where: prospectScopeWhere(user, scope),
    cursor: cursor ?? undefined,
  });

  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";
  const orphaned = !cursor && isAdmin
    ? (await prospectService.list({ where: { ownerId: "" }, limit: MAX_PAGE_LIMIT })).items
    : [];

  // Batch-resolve every listed prospect's demo map in one query - avoids an
  // N+1 `resolveProspectDemos` call per row on this list page.
  const demosByProspectId = await resolveProspectDemosBatch([
    ...page.items.map((p) => p.id),
    ...orphaned.map((p) => p.id),
  ]);
  const withDemos = (prospect: Prospect): ProspectProfile => ({
    ...prospectToProfile(prospect),
    demos: demosByProspectId.get(prospect.id) ?? {},
  });

  return {
    profiles: { items: page.items.map(withDemos), nextCursor: page.nextCursor },
    orphaned: orphaned.map(withDemos),
    scope,
  };
}

/**
 * `fetchPage` shape for `useInfiniteList` - unwraps `getAllProspectProfiles`
 * to the bare `Page<ProspectProfile>` the hook expects, always under the
 * same enforced `scope` the SSR-seeded first page used (never re-derived
 * from cookies mid-scroll, so a "Load more" click can't silently drift onto
 * whatever scope happens to be active by the time it fires).
 */
export async function listProspectsPage(
  scope: ProspectScope,
  cursor: string | null,
): Promise<Page<ProspectProfile>> {
  const { profiles } = await getAllProspectProfiles(scope, cursor);
  return profiles;
}

/**
 * `fetchPage` shape for the Overview home's infinite list: one page of
 * prospects merged with their engagement summary (`OverviewProspectRow`),
 * under the same enforced `scope` the SSR-seeded first page used. Each page
 * batch-resolves only its own rows' summaries.
 */
export async function listOverviewRowsPage(
  scope: ProspectScope,
  cursor: string | null,
): Promise<Page<OverviewProspectRow>> {
  const { profiles } = await getAllProspectProfiles(scope, cursor);
  const summaries = await services.analytics.prospectSummaries(
    profiles.items.map((p) => p.id),
  );
  return {
    items: profiles.items.map((p) => toOverviewRow(p, summaries)),
    nextCursor: profiles.nextCursor,
  };
}

/**
 * Org-wide stat-card totals for the Overview home, over EVERY prospect in the
 * enforced scope (never a single page - that's the bug this fixes). `prospects`
 * is the full scoped count; the rest come from one lean analytics read. Scope
 * is re-enforced server-side so it always matches the list below the cards.
 */
export async function getOverviewStats(
  requestedScope?: ProspectScope,
): Promise<OverviewEngagement & { prospects: number }> {
  const user = await getSessionUser();
  if (!user) {
    return { prospects: 0, sessions: 0, viewers: 0, activeThisWeek: 0 };
  }
  const scope = await enforceScope(user, requestedScope);
  const ids = await prospectService.listIds(prospectScopeWhere(user, scope));
  const engagement = await services.analytics.overviewEngagement(ids);
  return { prospects: ids.length, ...engagement };
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
 * List prospects for the config-form prospect picker. Progressive visibility:
 * a scoped user sees only their own prospects plus their teams'; ADMIN/OWNER
 * see all. `isMine` drives the picker grouping. Bounded to a single page at
 * `MAX_PAGE_LIMIT` (a combobox, not a paginated list, so this is an
 * intentional cap rather than the service's default page size) - Phase 07's
 * full curation UX gets "load more" if this ever proves too narrow.
 */
export async function listProspectOptions(): Promise<
  ActionResult<ProspectOption[]>
> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "Authentication required" };
  try {
    const visible = await visibleProspectIds(user);
    const page = await prospectService.list({
      where: prospectVisibilityWhere(visible),
      limit: MAX_PAGE_LIMIT,
    });
    const options = page.items
      .map((p) => ({
        id: p.id,
        name: p.name,
        isMine: p.createdById
          ? p.createdById === user.id
          : p.ownerId === user.dynamicUserId,
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
  demoType: "earn" | "checkout" | "wallet" | "remittance",
): Promise<ActionResult<ProspectProfile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!(await canMutateProspect(user, prospect))) {
      return { success: false, error: "Access denied" };
    }

    const demos = await resolveProspectDemos(id);
    const demoId = demos[demoType];
    if (!demoId) {
      return { success: false, error: `${demoType} demo not found` };
    }

    await deleteProspectDemoConfigs({ [demoType]: demoId });

    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${id}`);

    return { success: true, data: await toResolvedProfile(prospect) };
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
    checkout?: boolean;
    wallet?: boolean;
    remittance?: boolean;
    trade?: boolean;
    flow?: boolean;
  },
): Promise<ActionResult<ProspectProfile>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    const prospect = await prospectService.get(id);
    if (!prospect) {
      return { success: false, error: "Prospect profile not found" };
    }
    if (!(await canMutateProspect(user, prospect))) {
      return { success: false, error: "Access denied" };
    }

    const profile = prospectToProfile(prospect);
    const existingDemos = await resolveProspectDemos(id);
    const createOptions = {
      earn: demoTypes.earn && !existingDemos.earn,
      checkout: demoTypes.checkout && !existingDemos.checkout,
      wallet: demoTypes.wallet && !existingDemos.wallet,
      remittance: demoTypes.remittance && !existingDemos.remittance,
      trade: demoTypes.trade && !existingDemos.trade,
      flow: demoTypes.flow && !existingDemos.flow,
    };

    await createProspectDemoConfigs(
      profile.id,
      profile.name,
      profile.prospect,
      prospect.ownerId,
      createOptions,
    );

    revalidatePath("/dashboard/prospects");
    revalidatePath(`/dashboard/prospects/${id}`);

    return { success: true, data: await toResolvedProfile(prospect) };
  } catch (err) {
    // Log the real error server-side; never return raw messages to the client.
    console.error("Failed to create demo:", err);
    return { success: false, error: "Failed to create demo" };
  }
}
