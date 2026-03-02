/**
 * New Brand Profile Page
 *
 * Form for creating a new brand profile.
 * Uses shared AppearanceForm component with simplified mode.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createBrandProfile } from "@/lib/actions/brands";
import { Button } from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/app/checkouts/components/editor/toast";
import { Section, Field } from "@/app/checkouts/components/editor/form-components";
import {
  AppearanceForm,
  AppearanceTheme,
  AppearanceBranding,
  DEFAULT_APPEARANCE_THEME,
} from "@/components/shared/appearance-form";
import type { BrandTheme } from "@/lib/types/dashboard";

export default function NewBrandProfilePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Basic info
  const [name, setName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");

  // Appearance state
  const [theme, setTheme] = useState<AppearanceTheme>({
    primaryColor: DEFAULT_APPEARANCE_THEME.primaryColor,
    accentColor: DEFAULT_APPEARANCE_THEME.accentColor,
    borderRadius: DEFAULT_APPEARANCE_THEME.borderRadius,
  });
  const [branding, setBranding] = useState<AppearanceBranding>({
    logo: "",
  });

  // Demo selection
  const [generateEarn, setGenerateEarn] = useState(true);
  const [generateCheckouts, setGenerateCheckouts] = useState(true);
  const [generateWallet, setGenerateWallet] = useState(true);

  const allSelected = generateEarn && generateCheckouts && generateWallet;
  const noneSelected = !generateEarn && !generateCheckouts && !generateWallet;

  function toggleAll() {
    const newValue = !allSelected;
    setGenerateEarn(newValue);
    setGenerateCheckouts(newValue);
    setGenerateWallet(newValue);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (noneSelected) {
      setError("Please select at least one demo to generate");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Build full theme from appearance state
      const fullTheme: BrandTheme = {
        primaryColor: theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
        primaryHoverColor: theme.primaryHoverColor,
        accentColor: theme.accentColor,
        pageBackground: theme.pageBackground,
        background: theme.background,
        foreground: theme.foreground,
        mutedTextColor: theme.mutedTextColor,
        borderColor: theme.borderColor,
        rowBackground: theme.rowBackground,
        rowHoverBackground: theme.rowHoverBackground,
        gradientFrom: theme.gradientFrom,
        gradientTo: theme.gradientTo,
        borderRadius: theme.borderRadius,
      };

      const result = await createBrandProfile({
        name: name.trim(),
        companyUrl: companyUrl.trim() || undefined,
        brand: {
          logo: branding.logo ? "custom" : "dynamic",
          logoUrl: branding.logo || undefined,
          primaryColor: theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
          accentColor: theme.accentColor,
          borderRadius: theme.borderRadius,
          theme: fullTheme,
        },
        generateDemos: {
          earn: generateEarn,
          checkouts: generateCheckouts,
          wallet: generateWallet,
        },
      });

      if (result.success) {
        router.push(`/brands/${result.data.id}`);
      } else {
        setError(result.error || "Failed to create brand profile");
      }
    } catch (err) {
      setError("Failed to create brand profile");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/brands"
          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          New Brand Profile
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Basic Info */}
        <Section title="Basic Info">
          <Field label="Brand Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp Demo"
            />
          </Field>
          <Field label="Company Website">
            <Input
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://acme.com"
            />
          </Field>
        </Section>

        {/* Appearance - Simplified mode for brands */}
        <AppearanceForm
          theme={theme}
          branding={branding}
          onThemeChange={setTheme}
          onBrandingChange={setBranding}
          setToast={setToast}
          simplified={true}
          hideShowPoweredBy={true}
          companyUrl={companyUrl || undefined}
        />

        {/* Demo Selection */}
        <Section title="Generate Demos">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#525866]">
              Select which demo types to generate with your branding.
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-[#335cff] hover:text-[#2850e8] font-medium cursor-pointer"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="space-y-2 mt-3">
            <Checkbox
              checked={generateEarn}
              onChange={(e) => setGenerateEarn(e.target.checked)}
              label="Earn Demo — Creator payout dashboard with balance and withdrawal"
            />
            <Checkbox
              checked={generateCheckouts}
              onChange={(e) => setGenerateCheckouts(e.target.checked)}
              label="Checkouts Demo — Payment widget for crypto deposits and purchases"
            />
            <Checkbox
              checked={generateWallet}
              onChange={(e) => setGenerateWallet(e.target.checked)}
              label="Wallet Demo — Embedded wallet with auth and transaction support"
            />
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href="/brands">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white"
          >
            {isCreating ? "Creating..." : "Create Brand"}
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
