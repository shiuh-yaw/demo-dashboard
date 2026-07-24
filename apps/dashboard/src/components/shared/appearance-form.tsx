"use client";

/**
 * Shared Appearance Form Component
 *
 * Reusable form for editing theme/branding settings across all demo types.
 * Supports both simplified mode (for Prospects) and full mode (for Checkouts/Wallets).
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Select } from "@dynamic-demos/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  Section,
  Subsection,
  ColorField,
} from "@/app/(operator)/checkouts/components/editor/form-components";
import { AiStyleImport } from "@/app/(operator)/checkouts/components/editor/ai-style-import";
import { LogoField } from "@/components/shared/logo-field";
import type { BorderRadiusSize } from "@/lib/types/dashboard";

/**
 * Theme values for the appearance form
 * All fields are optional to support partial updates
 */
export interface AppearanceTheme {
  primaryColor?: string;
  primaryHoverColor?: string;
  accentColor?: string;
  pageBackground?: string;
  background?: string;
  foreground?: string;
  mutedTextColor?: string;
  borderColor?: string;
  rowBackground?: string;
  rowHoverBackground?: string;
  gradientFrom?: string;
  gradientTo?: string;
  borderRadius?: BorderRadiusSize;
}

/**
 * Branding values for the appearance form
 */
export interface AppearanceBranding {
  logo?: string;
  showPoweredBy?: boolean;
}

/**
 * Config object structure expected by AiStyleImport
 */
export interface AppearanceConfig {
  theme: AppearanceTheme;
  branding: AppearanceBranding;
}

/**
 * Default theme values
 */
export const DEFAULT_APPEARANCE_THEME: Required<AppearanceTheme> = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  pageBackground: "#f6f8fa",
  background: "#ffffff",
  foreground: "#000000",
  mutedTextColor: "#9a9a9a",
  borderColor: "#e7e8ed",
  rowBackground: "#f6f8f8",
  rowHoverBackground: "#eef1f1",
  gradientFrom: "#daffff",
  gradientTo: "rgba(218, 255, 255, 0.15)",
  borderRadius: "md",
};

interface AppearanceFormProps {
  /**
   * Current theme values
   */
  theme: AppearanceTheme;

  /**
   * Current branding values
   */
  branding: AppearanceBranding;

  /**
   * Called when any theme value changes
   */
  onThemeChange: (theme: AppearanceTheme) => void;

  /**
   * Called when any branding value changes
   */
  onBrandingChange: (branding: AppearanceBranding) => void;

  /**
   * Toast message handler
   */
  setToast: (message: string) => void;

  /**
   * Simplified mode hides extended color fields
   * Use for Prospect profiles that only need core colors
   */
  simplified?: boolean;

  /**
   * Hide the "Show Powered By" checkbox
   */
  hideShowPoweredBy?: boolean;

  /**
   * Hide the entire logo block (URL + upload + preview) for kinds that own
   * their logo elsewhere (e.g. Earn's brand-enum picker lives in KindFields).
   */
  hideLogo?: boolean;

  /**
   * Hide the Accent color field for kinds that do not consume it.
   */
  hideAccent?: boolean;

  /**
   * Company URL for AI style import (shows simplified import UI)
   */
  companyUrl?: string;

  /**
   * Renders without the outer "Appearance" bordered card - for hosts (like
   * the prospect Settings tab) that already wrap this form in their own
   * section card, so the fields don't render card-in-card.
   */
  bare?: boolean;

  /**
   * Hide the AI style import card - for hosts that render it themselves
   * elsewhere (e.g. prospect Basic Info, since import affects the logo).
   */
  hideAiImport?: boolean;

  /** Section card title - defaults to "Appearance". */
  title?: string;

  /** One-line muted subtitle under the title - omitted by default. */
  description?: string;

  /** Widens the Colors grid to lg:3/xl:4 columns for hosts with more horizontal room. Default false preserves the 2-column grid for every other caller. */
  wide?: boolean;
}

export function AppearanceForm({
  theme,
  branding,
  onThemeChange,
  onBrandingChange,
  setToast,
  simplified = false,
  hideShowPoweredBy = false,
  hideLogo = false,
  hideAccent = false,
  companyUrl,
  bare = false,
  hideAiImport = false,
  title = "Appearance",
  description,
  wide = false,
}: AppearanceFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build config object for AiStyleImport compatibility
  const config: AppearanceConfig = {
    theme,
    branding,
  };

  // Handle AI import - applies all captured colors
  function handleAiImport(newConfig: AppearanceConfig | null) {
    if (!newConfig) return;

    if (newConfig.theme) {
      onThemeChange({ ...theme, ...newConfig.theme });
    }

    if (newConfig.branding) {
      onBrandingChange({ ...branding, ...newConfig.branding });
    }
  }

  // Update single theme field
  const updateTheme = (key: keyof AppearanceTheme, value: string) => {
    onThemeChange({ ...theme, [key]: value });
  };

  // Update single branding field
  const updateBranding = (
    key: keyof AppearanceBranding,
    value: string | boolean
  ) => {
    onBrandingChange({ ...branding, [key]: value });
  };

  // Show AI import when: not simplified, OR simplified with company URL
  const showAiImport = !hideAiImport && (!simplified || !!companyUrl);

  const body = (
    <>
      {showAiImport && (
        <AiStyleImport
          config={config as never}
          setConfig={(fn) => {
            const result =
              typeof fn === "function" ? fn(config as never) : fn;
            handleAiImport(result as AppearanceConfig);
          }}
          setToast={setToast}
          companyUrl={companyUrl}
        />
      )}

      {/* Branding - operator dark tokens layer on the light hex via `dark:`. */}
      {(!hideLogo || !hideShowPoweredBy) && (
        <Subsection title="Branding">
          {!hideLogo && (
            <LogoField
              value={branding.logo || ""}
              onChange={(logo) => updateBranding("logo", logo)}
              setToast={setToast}
              previewBackground={
                theme.pageBackground || DEFAULT_APPEARANCE_THEME.pageBackground
              }
            />
          )}
          {!hideShowPoweredBy && (
            <div className="mt-3">
              <Checkbox
                checked={branding.showPoweredBy !== false}
                onChange={(e) =>
                  updateBranding("showPoweredBy", e.target.checked)
                }
                label='Show "Powered by Dynamic" footer'
              />
            </div>
          )}
        </Subsection>
      )}

      {/* Colors */}
      <Subsection title="Colors">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${wide ? "lg:grid-cols-3 xl:grid-cols-4" : ""}`}
        >
          {/* Core colors - always shown */}
          <ColorField
            label="Primary Color"
            value={theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor}
            onChange={(v) => updateTheme("primaryColor", v)}
          />
          {!hideAccent && (
            <ColorField
              label="Accent Color"
              value={theme.accentColor || DEFAULT_APPEARANCE_THEME.accentColor}
              onChange={(v) => updateTheme("accentColor", v)}
            />
          )}

          {/* Extended colors - shown when not simplified OR when advanced is expanded */}
          {(!simplified || showAdvanced) && (
            <>
              <ColorField
                label="Page Background"
                value={
                  theme.pageBackground || DEFAULT_APPEARANCE_THEME.pageBackground
                }
                onChange={(v) => updateTheme("pageBackground", v)}
              />
              <ColorField
                label="Widget Background"
                value={theme.background || DEFAULT_APPEARANCE_THEME.background}
                onChange={(v) => updateTheme("background", v)}
              />
              <ColorField
                label="Text Color"
                value={theme.foreground || DEFAULT_APPEARANCE_THEME.foreground}
                onChange={(v) => updateTheme("foreground", v)}
              />
              <ColorField
                label="Primary Hover"
                value={
                  theme.primaryHoverColor ||
                  DEFAULT_APPEARANCE_THEME.primaryHoverColor
                }
                onChange={(v) => updateTheme("primaryHoverColor", v)}
              />
              <ColorField
                label="Muted Text"
                value={
                  theme.mutedTextColor || DEFAULT_APPEARANCE_THEME.mutedTextColor
                }
                onChange={(v) => updateTheme("mutedTextColor", v)}
              />
              <ColorField
                label="Row Background"
                value={
                  theme.rowBackground || DEFAULT_APPEARANCE_THEME.rowBackground
                }
                onChange={(v) => updateTheme("rowBackground", v)}
              />
              <ColorField
                label="Row Hover"
                value={
                  theme.rowHoverBackground ||
                  DEFAULT_APPEARANCE_THEME.rowHoverBackground
                }
                onChange={(v) => updateTheme("rowHoverBackground", v)}
              />
              <ColorField
                label="Border Color"
                value={theme.borderColor || DEFAULT_APPEARANCE_THEME.borderColor}
                onChange={(v) => updateTheme("borderColor", v)}
              />
              <ColorField
                label="Gradient From"
                value={theme.gradientFrom || DEFAULT_APPEARANCE_THEME.gradientFrom}
                onChange={(v) => updateTheme("gradientFrom", v)}
              />
              <ColorField
                label="Gradient To"
                value={theme.gradientTo || DEFAULT_APPEARANCE_THEME.gradientTo}
                onChange={(v) => updateTheme("gradientTo", v)}
              />
            </>
          )}
        </div>

        {/* Advanced toggle - only shown in simplified mode */}
        {simplified && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            {showAdvanced ? "Hide advanced colors" : "Show advanced colors"}
          </button>
        )}
      </Subsection>

      {/* Style */}
      <Subsection title="Style">
        <Field label="Border Radius">
          <Select
            value={theme.borderRadius || DEFAULT_APPEARANCE_THEME.borderRadius}
            onChange={(e) =>
              updateTheme("borderRadius", e.target.value as BorderRadiusSize)
            }
            className="dark:bg-background dark:text-foreground dark:border-border"
          >
            <option value="xs">Extra Small</option>
            <option value="sm">Small</option>
            <option value="md">Medium (default)</option>
            <option value="lg">Large</option>
          </Select>
        </Field>
      </Subsection>
    </>
  );

  // `bare`: no outer card - the host section already renders one (avoids
  // card-in-card).
  return bare ? body : (
    <Section title={title} description={description}>
      {body}
    </Section>
  );
}
