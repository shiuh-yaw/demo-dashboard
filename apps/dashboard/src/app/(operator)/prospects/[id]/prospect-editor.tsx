"use client";

/**
 * Prospect Editor Component
 *
 * Form for editing an existing prospect profile with live demo links.
 * Uses shared AppearanceForm component with simplified mode.
 */

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Wallet,
  ArrowUpDown,
  Banknote,
  Plus,
  Loader2,
  Settings,
  Send,
} from "lucide-react";
import type { ProspectProfile, ProspectTheme } from "@/lib/types/dashboard";
import { updateProspectProfile, createMissingDemos, deleteProspectDemo } from "@/lib/actions/prospects";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { Section, Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import {
  AppearanceForm,
  AppearanceTheme,
  AppearanceBranding,
  DEFAULT_APPEARANCE_THEME,
} from "@/components/shared/appearance-form";
import { env } from "@/env";

// Demo type configuration
type DemoType = "earn" | "checkouts" | "wallet" | "remittance";

interface DemoConfig {
  type: DemoType;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  baseUrl: string;
  configRoute: string; // Dashboard route to edit config
}

const DEMO_CONFIGS: DemoConfig[] = [
  {
    type: "earn",
    label: "Earn Demo",
    icon: Banknote,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    baseUrl: env.NEXT_PUBLIC_EARN_PROJECT_URL,
    configRoute: "/earns",
  },
  {
    type: "checkouts",
    label: "Checkouts Demo",
    icon: ArrowUpDown,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    baseUrl: env.NEXT_PUBLIC_WIDGET_PROJECT_URL,
    configRoute: "/checkouts",
  },
  {
    type: "wallet",
    label: "Wallet Demo",
    icon: Wallet,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    baseUrl: env.NEXT_PUBLIC_WALLET_PROJECT_URL,
    configRoute: "/wallets",
  },
  {
    type: "remittance",
    label: "Remittance Demo",
    icon: Send,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    baseUrl: env.NEXT_PUBLIC_REMITTANCE_PROJECT_URL,
    configRoute: "/remittance",
  },
];

interface ProspectEditorProps {
  profile: ProspectProfile;
}

export function ProspectEditor({ profile: initialProfile }: ProspectEditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState<string | null>(null);
  const [isDeletingDemo, setIsDeletingDemo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(profile.name);
  const [companyUrl, setCompanyUrl] = useState(profile.companyUrl || "");

  // Appearance state - initialize from profile
  const [theme, setTheme] = useState<AppearanceTheme>({
    primaryColor: profile.prospect.primaryColor,
    accentColor: profile.prospect.accentColor || profile.prospect.primaryColor,
    borderRadius: profile.prospect.borderRadius || "md",
    // Include extended theme if present
    ...(profile.prospect.theme || {}),
  });
  const [branding, setBranding] = useState<AppearanceBranding>({
    logo: profile.prospect.logoUrl || "",
  });

  // Get demo URL for a given type. All demo apps share the same URL
  // contract: `<baseUrl>/?theme=<configId>`. The middleware in each app
  // resolves the prospect from the `theme` query (or sticky cookie) and
  // forwards it as a header to the layout, which fetches and applies it.
  function getDemoUrl(config: DemoConfig): string | null {
    const demoId = profile.demos[config.type];
    if (!demoId) return null;
    return `${config.baseUrl}/?theme=${demoId}`;
  }

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      // Build full theme from appearance state
      const fullTheme: ProspectTheme = {
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

      const result = await updateProspectProfile(profile.id, {
        name: name.trim(),
        companyUrl: companyUrl.trim() || undefined,
        prospect: {
          logo: branding.logo ? "custom" : "dynamic",
          logoUrl: branding.logo || undefined,
          primaryColor: theme.primaryColor || DEFAULT_APPEARANCE_THEME.primaryColor,
          accentColor: theme.accentColor,
          borderRadius: theme.borderRadius,
          theme: fullTheme,
        },
      });

      if (result.success) {
        setProfile(result.data);
        setToast("Prospect profile saved");
      } else {
        setToast(result.error || "Failed to save profile");
      }
    } catch (err) {
      setToast("Failed to save profile");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  function copyLink(url: string, type: string) {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setToast(`${type} demo link copied`);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  async function handleCreateDemo(
    type: "earn" | "checkouts" | "wallet" | "remittance",
  ) {
    setIsCreatingDemo(type);
    try {
      const result = await createMissingDemos(profile.id, { [type]: true });
      if (result.success) {
        setProfile(result.data);
        setToast(`${type.charAt(0).toUpperCase() + type.slice(1)} demo created`);
      } else {
        setToast(result.error || `Failed to create ${type} demo`);
      }
    } catch (err) {
      setToast(`Failed to create ${type} demo`);
      console.error(err);
    } finally {
      setIsCreatingDemo(null);
    }
  }

  async function handleDeleteDemo(
    type: "earn" | "checkouts" | "wallet" | "remittance",
  ) {
    setIsDeletingDemo(type);
    try {
      const result = await deleteProspectDemo(profile.id, type);
      if (result.success) {
        setProfile(result.data);
        setToast(`${type.charAt(0).toUpperCase() + type.slice(1)} demo deleted`);
      } else {
        setToast(result.error || `Failed to delete ${type} demo`);
      }
    } catch (err) {
      setToast(`Failed to delete ${type} demo`);
      console.error(err);
    } finally {
      setIsDeletingDemo(null);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/prospects"
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Demo Links Card */}
        <Section title="Demo Links">
          <div className="space-y-3">
            {DEMO_CONFIGS.map((config) => {
              const Icon = config.icon;
              const url = getDemoUrl(config);
              const label = config.label.replace(" Demo", "");

              return (
                <div
                  key={config.type}
                  className="flex items-center gap-3 p-3 bg-[#f8f9fb] rounded-lg"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#0e121b]">
                      {config.label}
                    </p>
                    <p className="text-[11px] text-[#99a0ae] truncate">
                      {url || "Not created"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {url ? (
                      <>
                        <Link
                          href={`${config.configRoute}/${profile.demos[config.type]}`}
                          className="p-1.5 text-[#99a0ae] hover:text-[#0e121b] hover:bg-[#e1e4ea] rounded-md transition-colors"
                          title="Edit config"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => copyLink(url, label)}
                          className="p-1.5 text-[#99a0ae] hover:text-[#0e121b] hover:bg-[#e1e4ea] rounded-md transition-colors cursor-pointer"
                          title="Copy link"
                        >
                          {copiedLink === label ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#99a0ae] hover:text-[#0e121b] hover:bg-[#e1e4ea] rounded-md transition-colors"
                          title="Open demo"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDemo(config.type)}
                          disabled={isDeletingDemo !== null}
                          className="p-1.5 text-[#99a0ae] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete demo"
                        >
                          {isDeletingDemo === config.type ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleCreateDemo(config.type)}
                        disabled={isCreatingDemo !== null}
                      >
                        {isCreatingDemo === config.type ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        Create
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Basic Info */}
        <Section title="Basic Info">
          <Field label="Prospect Name *">
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

        {/* Appearance - Simplified mode for prospects */}
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
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
