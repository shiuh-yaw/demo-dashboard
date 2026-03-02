/**
 * New Wallet Config Page
 *
 * Form for creating a new Wallet configuration with inline preview.
 * Uses shared AppearanceForm and InlineWidgetPreview components.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createWalletConfig } from "@/lib/actions/wallets";
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
import type { WalletConfig } from "@/lib/types/dashboard";

export default function NewWalletConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");

  // Appearance state
  const [theme, setTheme] = useState<AppearanceTheme>({
    ...DEFAULT_APPEARANCE_THEME,
  });
  const [branding, setBranding] = useState<AppearanceBranding>({
    logo: "",
    showPoweredBy: true,
  });

  async function handleCreate() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsCreating(true);

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
      const result = await createWalletConfig(name.trim(), config);

      if (result.success) {
        router.push(`/wallets/${result.data.id}`);
      } else {
        setToast(result.error || "Failed to create config");
      }
    } catch (err) {
      setToast("Failed to create config");
      console.error(err);
    } finally {
      setIsCreating(false);
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
          <h1 className="text-xl font-semibold text-slate-900">
            New Wallet Config
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/wallets">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white"
          >
            {isCreating ? "Creating..." : "Create Config"}
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

        {/* Preview Panel */}
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
