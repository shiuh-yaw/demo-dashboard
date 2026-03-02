"use client";

/**
 * Wallet Config Editor Component
 *
 * Client component for editing Wallet configurations with inline preview.
 * Uses shared UI components from @dynamic-demos/ui for the preview.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateWalletConfig } from "@/lib/actions/wallets";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/checkouts/components/editor/toast";
import { Section, Field } from "@/app/checkouts/components/editor/form-components";
import {
  AppearanceForm,
  AppearanceTheme,
  AppearanceBranding,
  DEFAULT_APPEARANCE_THEME,
} from "@/components/shared/appearance-form";
import { InlineWidgetPreview } from "@/components/shared/inline-widget-preview";
import { env } from "@/env";
import type { StoredWalletConfig, WalletConfig } from "@/lib/types/dashboard";

const WALLET_PROJECT_URL = env.NEXT_PUBLIC_WALLET_PROJECT_URL;

interface WalletConfigEditorProps {
  config: StoredWalletConfig;
}

export function WalletConfigEditor({
  config: initialConfig,
}: WalletConfigEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(initialConfig.name);

  // Initialize appearance state from config
  const [theme, setTheme] = useState<AppearanceTheme>({
    pageBackground: initialConfig.config.theme?.pageBackground || DEFAULT_APPEARANCE_THEME.pageBackground,
    background: initialConfig.config.theme?.background || DEFAULT_APPEARANCE_THEME.background,
    foreground: initialConfig.config.theme?.foreground || DEFAULT_APPEARANCE_THEME.foreground,
    primaryColor: initialConfig.config.theme?.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
    primaryHoverColor: initialConfig.config.theme?.primaryHoverColor || DEFAULT_APPEARANCE_THEME.primaryHoverColor,
    accentColor: initialConfig.config.theme?.accentColor || DEFAULT_APPEARANCE_THEME.accentColor,
    mutedTextColor: initialConfig.config.theme?.mutedTextColor || DEFAULT_APPEARANCE_THEME.mutedTextColor,
    rowBackground: initialConfig.config.theme?.rowBackground || DEFAULT_APPEARANCE_THEME.rowBackground,
    rowHoverBackground: initialConfig.config.theme?.rowHoverBackground || DEFAULT_APPEARANCE_THEME.rowHoverBackground,
    borderColor: initialConfig.config.theme?.borderColor || DEFAULT_APPEARANCE_THEME.borderColor,
    gradientFrom: initialConfig.config.theme?.gradientFrom || DEFAULT_APPEARANCE_THEME.gradientFrom,
    gradientTo: initialConfig.config.theme?.gradientTo || DEFAULT_APPEARANCE_THEME.gradientTo,
    borderRadius: initialConfig.config.theme?.borderRadius || DEFAULT_APPEARANCE_THEME.borderRadius,
  });

  const [branding, setBranding] = useState<AppearanceBranding>({
    logo: initialConfig.config.branding?.logo || "",
    showPoweredBy: initialConfig.config.branding?.showPoweredBy ?? true,
  });

  const demoUrl = `${WALLET_PROJECT_URL}/?id=${initialConfig.id}`;

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<WalletConfig> = {
        theme: {
          pageBackground: theme.pageBackground,
          background: theme.background,
          foreground: theme.foreground,
          primaryColor: theme.primaryColor,
          primaryHoverColor: theme.primaryHoverColor,
          accentColor: theme.accentColor,
          mutedTextColor: theme.mutedTextColor,
          rowBackground: theme.rowBackground,
          rowHoverBackground: theme.rowHoverBackground,
          borderColor: theme.borderColor,
          gradientFrom: theme.gradientFrom,
          gradientTo: theme.gradientTo,
          borderRadius: theme.borderRadius,
        },
        branding: {
          logo: branding.logo || undefined,
          showPoweredBy: branding.showPoweredBy,
        },
      };

      const result = await updateWalletConfig(initialConfig.id, {
        name: name.trim(),
        config,
      });

      if (result.success) {
        setToast("Config saved");
        router.refresh();
      } else {
        setToast(result.error || "Failed to save config");
      }
    } catch (err) {
      setToast("Failed to save config");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/wallets"
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Demo
          </a>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white text-xs"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Editor Panel */}
        <div className="flex-1 max-w-xl space-y-5">
          {/* Basic Info */}
          <Section title="Basic Info">
            <Field label="Name *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Wallet Config"
              />
            </Field>
          </Section>

          {/* Appearance - Full mode for wallets */}
          <AppearanceForm
            theme={theme}
            branding={branding}
            onThemeChange={setTheme}
            onBrandingChange={setBranding}
            setToast={setToast}
            simplified={false}
            hideShowPoweredBy={false}
          />
        </div>

        {/* Preview Panel - Uses shared UI components directly */}
        <InlineWidgetPreview
          theme={{
            pageBackground: theme.pageBackground,
            background: theme.background,
            foregroundColor: theme.foreground,
            primaryColor: theme.primaryColor,
            primaryHoverColor: theme.primaryHoverColor,
            accentColor: theme.accentColor,
            mutedTextColor: theme.mutedTextColor,
            rowBackground: theme.rowBackground,
            rowHoverBackground: theme.rowHoverBackground,
            borderColor: theme.borderColor,
            gradientFrom: theme.gradientFrom,
            gradientTo: theme.gradientTo,
            borderRadius: theme.borderRadius,
          }}
          branding={{
            logo: branding.logo,
            showPoweredBy: branding.showPoweredBy,
          }}
        />
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
