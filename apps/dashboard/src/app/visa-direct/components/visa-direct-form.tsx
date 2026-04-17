"use client";

/**
 * Visa Direct Config Form
 *
 * Shared fields for the create and edit views — name, branding, and
 * per-color theme controls. Keeps both pages in sync.
 */

import { Input } from "@dynamic-demos/ui";
import {
  Section,
  Field,
  ColorField,
} from "@/app/checkouts/components/editor/form-components";
import type {
  VisaDirectBranding,
  VisaDirectTheme,
} from "@/lib/types/dashboard";

interface VisaDirectFormProps {
  name: string;
  onNameChange: (value: string) => void;
  branding: VisaDirectBranding;
  onBrandingChange: (value: VisaDirectBranding) => void;
  theme: VisaDirectTheme;
  onThemeChange: (value: VisaDirectTheme) => void;
  onResetDefaults?: () => void;
}

export function VisaDirectForm({
  name,
  onNameChange,
  branding,
  onBrandingChange,
  theme,
  onThemeChange,
  onResetDefaults,
}: VisaDirectFormProps) {
  const updateBranding = <K extends keyof VisaDirectBranding>(
    key: K,
    value: VisaDirectBranding[K]
  ) => onBrandingChange({ ...branding, [key]: value });

  const updateTheme = <K extends keyof VisaDirectTheme>(
    key: K,
    value: VisaDirectTheme[K]
  ) => onThemeChange({ ...theme, [key]: value });

  return (
    <div className="max-w-xl space-y-5">
      <Section title="Basic Info">
        <Field label="Name *">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="My Visa Direct Config"
          />
        </Field>
      </Section>

      <Section title="Branding">
        <Field label="Logo URL (leave empty for Dynamic wordmark)">
          <Input
            value={branding.logoUrl ?? ""}
            onChange={(e) => updateBranding("logoUrl", e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </Field>
        <Field label="Banner Text (leave empty to hide)">
          <Input
            value={branding.bannerText ?? ""}
            onChange={(e) => updateBranding("bannerText", e.target.value)}
            placeholder="Demo environment — Visa Direct × Fireblocks"
          />
        </Field>
      </Section>

      <div className="bg-white rounded-xl border border-[#e1e4ea] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#0e121b]">Theme</h3>
          {onResetDefaults && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-md border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
            >
              Reset to Dynamic defaults
            </button>
          )}
        </div>
        <div className="space-y-3">
          <ColorField
            label="Primary color"
            value={theme.primaryColor}
            onChange={(v) => updateTheme("primaryColor", v)}
          />
        </div>
      </div>
    </div>
  );
}
