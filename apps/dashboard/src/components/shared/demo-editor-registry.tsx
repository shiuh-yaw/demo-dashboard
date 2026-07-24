"use client";

/**
 * Demo editor registry: the one seam that keeps `DemoConfigEditor` a single
 * component. Per kind it declares the AppearanceForm mode, the kind-specific
 * `KindFields` slot, how to hydrate the shell's state from a stored config,
 * and a `save` that calls the existing `update{Kind}Config` action. Editor
 * normalization only - no storage/Zod/mapper change; each `save` builds the
 * exact `Partial<Config>` its legacy editor already built.
 */

import { Input } from "@dynamic-demos/ui";
import {
  Section,
  Field,
  ColorField,
} from "@/app/(operator)/checkouts/components/editor/form-components";
import {
  DEFAULT_APPEARANCE_THEME,
  type AppearanceTheme,
  type AppearanceBranding,
} from "@/components/shared/appearance-form";
import { updateWalletConfig } from "@/lib/actions/wallets";
import { updateEarnConfig } from "@/lib/actions/earns";
import { updateRemittanceConfig } from "@/lib/actions/remittance";
import { updateTradeConfig } from "@/lib/actions/trade";
import { updateVisaDirectConfig } from "@/lib/actions/visa-direct";
import type { DemoConfigKind } from "@/lib/services/types";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type StoredWalletConfig,
  type StoredEarnConfig,
  type StoredRemittanceConfig,
  type StoredTradeConfig,
  type StoredVisaDirectConfig,
  type WalletConfig,
  type EarnConfig,
  type EarnBrand,
  type RemittanceConfig,
  type TradeConfig,
  type VisaDirectConfig,
} from "@/lib/types/dashboard";

export type StoredDemoConfig =
  | StoredWalletConfig
  | StoredEarnConfig
  | StoredRemittanceConfig
  | StoredTradeConfig
  | StoredVisaDirectConfig;

export interface AppearanceState {
  theme: AppearanceTheme;
  branding: AppearanceBranding;
}

export type KindState = Record<string, unknown>;

export interface KindFieldsProps {
  state: KindState;
  setState: (updater: (prev: KindState) => KindState) => void;
  setToast: (message: string) => void;
}

export interface SaveArgs {
  name: string;
  appearance: AppearanceState;
  kindState: KindState;
  prospectId: string | null;
  original: StoredDemoConfig;
}

export interface DemoEditorEntry {
  appearanceMode: "full" | "simplified" | "none";
  hideLogo?: boolean;
  hideAccent?: boolean;
  hideShowPoweredBy?: boolean;
  /** Skip KindFields in the prospect-instance editor when they are pure branding (the prospect binding + theme cover brand there). */
  hideKindFieldsInInstance?: boolean;
  /** Prefill the appearance palette from a picked prospect (wallet only today). */
  prospectPrefill?: boolean;
  /** Back target for the standalone (non prospect-bound) editor route. */
  backHref: string;
  KindFields?: React.ComponentType<KindFieldsProps>;
  initAppearance?: (config: StoredDemoConfig) => AppearanceState;
  initKindState?: (config: StoredDemoConfig) => KindState;
  save?: (
    id: string,
    args: SaveArgs,
  ) => Promise<{ success: boolean; error?: string }>;
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

// ---------------------------------------------------------------------------
// Wallet - full palette; App Name is the only kind-specific field.
// ---------------------------------------------------------------------------

function WalletKindFields({ state, setState }: KindFieldsProps) {
  return (
    <Section title="Branding">
      <Field label="App Name">
        <Input
          value={str(state.appName)}
          onChange={(e) =>
            setState((prev) => ({ ...prev, appName: e.target.value }))
          }
          placeholder="Acme"
          className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
        />
      </Field>
    </Section>
  );
}

const walletEntry: DemoEditorEntry = {
  appearanceMode: "full",
  prospectPrefill: true,
  backHref: "/wallets",
  KindFields: WalletKindFields,
  // App Name is pure branding; the prospect + theme cover it in-context.
  hideKindFieldsInInstance: true,
  initAppearance: (c) => {
    const cfg = (c as StoredWalletConfig).config;
    const t = cfg.theme ?? {};
    return {
      theme: {
        pageBackground: t.pageBackground || DEFAULT_APPEARANCE_THEME.pageBackground,
        background: t.background || DEFAULT_APPEARANCE_THEME.background,
        foreground: t.foreground || DEFAULT_APPEARANCE_THEME.foreground,
        primaryColor: t.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
        primaryHoverColor:
          t.primaryHoverColor || DEFAULT_APPEARANCE_THEME.primaryHoverColor,
        accentColor: t.accentColor || DEFAULT_APPEARANCE_THEME.accentColor,
        mutedTextColor:
          t.mutedTextColor || DEFAULT_APPEARANCE_THEME.mutedTextColor,
        rowBackground: t.rowBackground || DEFAULT_APPEARANCE_THEME.rowBackground,
        rowHoverBackground:
          t.rowHoverBackground || DEFAULT_APPEARANCE_THEME.rowHoverBackground,
        borderColor: t.borderColor || DEFAULT_APPEARANCE_THEME.borderColor,
        gradientFrom: t.gradientFrom || DEFAULT_APPEARANCE_THEME.gradientFrom,
        gradientTo: t.gradientTo || DEFAULT_APPEARANCE_THEME.gradientTo,
        borderRadius: t.borderRadius || DEFAULT_APPEARANCE_THEME.borderRadius,
      },
      branding: {
        logo: cfg.branding?.logo || "",
        showPoweredBy: cfg.branding?.showPoweredBy ?? true,
      },
    };
  },
  initKindState: (c) => ({
    appName: (c as StoredWalletConfig).config.branding?.appName || "",
  }),
  save: async (id, { name, appearance, kindState, prospectId }) => {
    const config: Partial<WalletConfig> = {
      theme: {
        pageBackground: appearance.theme.pageBackground,
        background: appearance.theme.background,
        foreground: appearance.theme.foreground,
        primaryColor: appearance.theme.primaryColor,
        primaryHoverColor: appearance.theme.primaryHoverColor,
        accentColor: appearance.theme.accentColor,
        mutedTextColor: appearance.theme.mutedTextColor,
        rowBackground: appearance.theme.rowBackground,
        rowHoverBackground: appearance.theme.rowHoverBackground,
        borderColor: appearance.theme.borderColor,
        gradientFrom: appearance.theme.gradientFrom,
        gradientTo: appearance.theme.gradientTo,
        borderRadius: appearance.theme.borderRadius,
      },
      branding: {
        logo: appearance.branding.logo || undefined,
        appName: str(kindState.appName).trim() || undefined,
        showPoweredBy: appearance.branding.showPoweredBy,
      },
    };
    return updateWalletConfig(id, { name, config, prospectId });
  },
};

// ---------------------------------------------------------------------------
// Earn - simplified colors (primary + accent); logo is a brand enum + fields.
// ---------------------------------------------------------------------------

const EARN_BRAND_OPTIONS: { value: EarnBrand; label: string }[] = [
  { value: "dynamic", label: "Dynamic" },
  { value: "youtube", label: "YouTube" },
  { value: "meta", label: "Meta" },
  { value: "remitly", label: "Remitly" },
  { value: "custom", label: "Custom URL" },
];

function EarnKindFields({ state, setState }: KindFieldsProps) {
  const brand = (state.logo as EarnBrand) ?? "dynamic";
  const set = (patch: Partial<KindState>) =>
    setState((prev) => ({ ...prev, ...patch }));
  return (
    <>
      <Section title="Content">
        <Field label="Page Title">
          <Input
            value={str(state.pageTitle)}
            onChange={(e) => set({ pageTitle: e.target.value })}
            placeholder="Earn"
            className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="Page Description">
          <Input
            value={str(state.pageDescription)}
            onChange={(e) => set({ pageDescription: e.target.value })}
            placeholder="Manage your earnings, balance, and payouts."
            className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          />
        </Field>
      </Section>

      <Section title="Branding">
        <Field label="Logo">
          <div className="flex flex-wrap gap-2">
            {EARN_BRAND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set({ logo: option.value })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  brand === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        {brand === "custom" && (
          <Field label="Logo URL">
            <Input
              value={str(state.logoUrl)}
              onChange={(e) => set({ logoUrl: e.target.value })}
              placeholder="https://example.com/logo.svg"
              className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
            />
          </Field>
        )}
        <Field label="Token Name">
          <Input
            value={str(state.tokenName)}
            onChange={(e) => set({ tokenName: e.target.value })}
            placeholder="USDC"
            className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          />
        </Field>
        <Field label="App Name">
          <Input
            value={str(state.appName)}
            onChange={(e) => set({ appName: e.target.value })}
            placeholder="Acme"
            className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
          />
        </Field>
      </Section>

      <Section title="Layout">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Show Sidebar
          </label>
          <button
            type="button"
            onClick={() => set({ showSidebar: !state.showSidebar })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              state.showSidebar ? "bg-primary" : "bg-muted"
            }`}
            aria-pressed={Boolean(state.showSidebar)}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                state.showSidebar ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </Section>
    </>
  );
}

const earnEntry: DemoEditorEntry = {
  appearanceMode: "simplified",
  hideLogo: true,
  hideShowPoweredBy: true,
  backHref: "/earns",
  KindFields: EarnKindFields,
  initAppearance: (c) => {
    const t = (c as StoredEarnConfig).config.theme ?? {};
    return {
      theme: {
        primaryColor: t.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
        accentColor: t.accentColor || DEFAULT_APPEARANCE_THEME.accentColor,
      },
      branding: {},
    };
  },
  initKindState: (c) => {
    const b = (c as StoredEarnConfig).config.branding;
    return {
      logo: b?.logo || "dynamic",
      logoUrl: b?.logoUrl || "",
      tokenName: b?.tokenName || "USDC",
      appName: b?.appName || "",
      pageTitle: b?.pageTitle || "Earn",
      pageDescription:
        b?.pageDescription || "Manage your earnings, balance, and payouts.",
      showSidebar: (c as StoredEarnConfig).config.layout?.showSidebar ?? false,
    };
  },
  save: async (id, { name, appearance, kindState, prospectId, original }) => {
    const brand = (kindState.logo as EarnBrand) ?? "dynamic";
    const config: Partial<EarnConfig> = {
      branding: {
        logo: brand,
        logoUrl: brand === "custom" ? str(kindState.logoUrl) : undefined,
        appName: str(kindState.appName).trim() || undefined,
        tokenName: str(kindState.tokenName) || "USDC",
        pageTitle: str(kindState.pageTitle) || "Earn",
        pageDescription:
          str(kindState.pageDescription) ||
          "Manage your earnings, balance, and payouts.",
      },
      theme: {
        primaryColor: appearance.theme.primaryColor,
        accentColor: appearance.theme.accentColor,
      },
      layout: { showSidebar: Boolean(kindState.showSidebar) },
    };
    return updateEarnConfig(id, {
      name,
      description: (original as StoredEarnConfig).description?.trim() || undefined,
      config,
      prospectId,
    });
  },
};

// ---------------------------------------------------------------------------
// Remittance - primary color + logo (common); secondary color + appName here.
// ---------------------------------------------------------------------------

function RemittanceKindFields({ state, setState }: KindFieldsProps) {
  const set = (patch: Partial<KindState>) =>
    setState((prev) => ({ ...prev, ...patch }));
  return (
    <Section title="Branding">
      <ColorField
        label="Secondary Color"
        value={str(state.secondaryColor, "#1e40af")}
        onChange={(v) => set({ secondaryColor: v })}
      />
      <Field label="App Name">
        <Input
          value={str(state.appName)}
          onChange={(e) => set({ appName: e.target.value })}
          placeholder="Acme"
          className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
        />
      </Field>
    </Section>
  );
}

const remittanceEntry: DemoEditorEntry = {
  appearanceMode: "simplified",
  hideAccent: true,
  hideShowPoweredBy: true,
  backHref: "/remittance",
  KindFields: RemittanceKindFields,
  initAppearance: (c) => {
    const cfg = (c as StoredRemittanceConfig).config;
    return {
      theme: { primaryColor: cfg.theme?.primaryColor ?? "#1a56db" },
      branding: { logo: cfg.branding?.logoUrl ?? "" },
    };
  },
  initKindState: (c) => {
    const cfg = (c as StoredRemittanceConfig).config;
    return {
      secondaryColor: cfg.theme?.secondaryColor ?? "#1e40af",
      appName: cfg.branding?.appName ?? "",
    };
  },
  save: async (id, { name, appearance, kindState, prospectId }) => {
    const config: Partial<RemittanceConfig> = {
      theme: {
        primaryColor: appearance.theme.primaryColor || undefined,
        secondaryColor: str(kindState.secondaryColor) || undefined,
      },
      branding: {
        logoUrl: (appearance.branding.logo || "").trim() || undefined,
        appName: str(kindState.appName).trim() || undefined,
      },
    };
    return updateRemittanceConfig(id, { name, config, prospectId });
  },
};

// ---------------------------------------------------------------------------
// Trade - branding only (no theme in the config shape); logo URL + appName.
// ---------------------------------------------------------------------------

function TradeKindFields({ state, setState }: KindFieldsProps) {
  const set = (patch: Partial<KindState>) =>
    setState((prev) => ({ ...prev, ...patch }));
  return (
    <Section title="Branding">
      <Field label="Logo URL">
        <Input
          value={str(state.logoUrl)}
          onChange={(e) => set({ logoUrl: e.target.value })}
          placeholder="https://example.com/logo.png"
          className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
        />
      </Field>
      <Field label="App Name">
        <Input
          value={str(state.appName)}
          onChange={(e) => set({ appName: e.target.value })}
          placeholder="NovaX"
          className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
        />
      </Field>
    </Section>
  );
}

const tradeEntry: DemoEditorEntry = {
  appearanceMode: "none",
  backHref: "/trade",
  KindFields: TradeKindFields,
  initAppearance: () => ({ theme: {}, branding: {} }),
  initKindState: (c) => {
    const b = (c as StoredTradeConfig).config.branding;
    return { logoUrl: b?.logoUrl ?? "", appName: b?.appName ?? "NovaX" };
  },
  save: async (id, { name, kindState, prospectId }) => {
    const config: Partial<TradeConfig> = {
      branding: {
        logoUrl: str(kindState.logoUrl).trim() || undefined,
        appName: str(kindState.appName).trim() || undefined,
      },
    };
    return updateTradeConfig(id, { name, config, prospectId });
  },
};

// ---------------------------------------------------------------------------
// Visa Direct - primary color + logo (common); banner text kind-specific.
// ---------------------------------------------------------------------------

function VisaDirectKindFields({ state, setState }: KindFieldsProps) {
  return (
    <Section title="Banner">
      <Field label="Banner Text (leave empty to hide)">
        <Input
          value={str(state.bannerText)}
          onChange={(e) =>
            setState((prev) => ({ ...prev, bannerText: e.target.value }))
          }
          placeholder="Demo environment - Visa Direct x Fireblocks"
          className="dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
        />
      </Field>
    </Section>
  );
}

const visaDirectEntry: DemoEditorEntry = {
  appearanceMode: "simplified",
  hideAccent: true,
  hideShowPoweredBy: true,
  backHref: "/visa-direct",
  KindFields: VisaDirectKindFields,
  initAppearance: (c) => {
    const cfg = (c as StoredVisaDirectConfig).config;
    return {
      theme: {
        primaryColor:
          cfg.theme?.primaryColor ??
          DEFAULT_VISA_DIRECT_CONFIG.theme.primaryColor,
      },
      branding: { logo: cfg.branding?.logoUrl ?? "" },
    };
  },
  initKindState: (c) => ({
    bannerText: (c as StoredVisaDirectConfig).config.branding?.bannerText ?? "",
  }),
  save: async (id, { name, appearance, kindState, prospectId, original }) => {
    const existing = (original as StoredVisaDirectConfig).config;
    const config: Partial<VisaDirectConfig> = {
      branding: {
        ...DEFAULT_VISA_DIRECT_CONFIG.branding,
        ...existing.branding,
        logoUrl: (appearance.branding.logo || "").trim() || undefined,
        bannerText: str(kindState.bannerText) || undefined,
      },
      theme: {
        ...DEFAULT_VISA_DIRECT_CONFIG.theme,
        ...existing.theme,
        primaryColor:
          appearance.theme.primaryColor ||
          DEFAULT_VISA_DIRECT_CONFIG.theme.primaryColor,
      },
    };
    return updateVisaDirectConfig(id, { name, config, prospectId });
  },
};

// Checkout has its own tabbed console (see EXTERNAL_CONSOLE_HREF); the
// instance page redirects there rather than mounting DemoConfigEditor.
const checkoutEntry: DemoEditorEntry = {
  appearanceMode: "none",
  backHref: "/checkouts",
};

// Flow has no in-dashboard editor - its theme comes from the prospect and
// apps/flow owns the config. The instance page renders the shared insights +
// share view (see DASHBOARD_EDITABLE_KINDS in demo-editor-metadata).
const flowEntry: DemoEditorEntry = {
  appearanceMode: "none",
  backHref: "/dashboard/prospects",
};

export const demoEditorRegistry: Record<DemoConfigKind, DemoEditorEntry> = {
  wallet: walletEntry,
  earn: earnEntry,
  remittance: remittanceEntry,
  trade: tradeEntry,
  "visa-direct": visaDirectEntry,
  checkout: checkoutEntry,
  flow: flowEntry,
};

export function getDemoEditorEntry(kind: DemoConfigKind): DemoEditorEntry {
  return demoEditorRegistry[kind];
}
