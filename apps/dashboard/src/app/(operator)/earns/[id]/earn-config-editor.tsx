"use client";

/**
 * Earn Config Editor Component
 *
 * Client component for editing Earn configurations.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import Link from "next/link";
import { updateEarnConfig } from "@/lib/actions/earns";
import { Button } from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { env } from "@/env";
import type {
  StoredEarnConfig,
  EarnBrand,
  EarnConfig,
} from "@/lib/types/dashboard";

const EARN_PROJECT_URL = env.NEXT_PUBLIC_EARN_PROJECT_URL;

const BRAND_OPTIONS: { value: EarnBrand; label: string }[] = [
  { value: "dynamic", label: "Dynamic" },
  { value: "youtube", label: "YouTube" },
  { value: "meta", label: "Meta" },
  { value: "remitly", label: "Remitly" },
  { value: "custom", label: "Custom URL" },
];

interface EarnConfigEditorProps {
  config: StoredEarnConfig;
}

export function EarnConfigEditor({
  config: initialConfig,
}: EarnConfigEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState(initialConfig.name);
  const [description, setDescription] = useState(
    initialConfig.description || "",
  );
  const [brand, setBrand] = useState<EarnBrand>(
    initialConfig.config.branding?.logo || "dynamic",
  );
  const [logoUrl, setLogoUrl] = useState(
    initialConfig.config.branding?.logoUrl || "",
  );
  const [tokenName, setTokenName] = useState(
    initialConfig.config.branding?.tokenName || "USDC",
  );
  const [pageTitle, setPageTitle] = useState(
    initialConfig.config.branding?.pageTitle || "Earn",
  );
  const [pageDescription, setPageDescription] = useState(
    initialConfig.config.branding?.pageDescription ||
      "Manage your earnings, balance, and payouts.",
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialConfig.config.theme?.primaryColor || "#4779FF",
  );
  const [accentColor, setAccentColor] = useState(
    initialConfig.config.theme?.accentColor || "#1967D2",
  );
  const [showSidebar, setShowSidebar] = useState(
    initialConfig.config.layout?.showSidebar ?? false,
  );

  const demoUrl = `${EARN_PROJECT_URL}/?theme=${initialConfig.id}`;

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<EarnConfig> = {
        branding: {
          logo: brand,
          logoUrl: brand === "custom" ? logoUrl : undefined,
          tokenName: tokenName || "USDC",
          pageTitle: pageTitle || "Earn",
          pageDescription:
            pageDescription || "Manage your earnings, balance, and payouts.",
        },
        theme: {
          primaryColor,
          accentColor,
        },
        layout: {
          showSidebar,
        },
      };

      const result = await updateEarnConfig(initialConfig.id, {
        name: name.trim(),
        description: description.trim() || undefined,
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

  function handleCopyUrl() {
    navigator.clipboard.writeText(demoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/earns"
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

      {/* Demo URL */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">Demo URL</div>
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="text-sm font-mono text-slate-700 truncate">
          {demoUrl}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Basic Info</h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Config"
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Company name shown in browser tab (e.g., &quot;Name - Earn
              Demo&quot;)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Page Title
            </label>
            <Input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="Earn"
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Title shown on the main page header
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Page Description
            </label>
            <Input
              value={pageDescription}
              onChange={(e) => setPageDescription(e.target.value)}
              placeholder="Manage your earnings, balance, and payouts."
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Description shown below the page title
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Branding</h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Logo
            </label>
            <div className="flex flex-wrap gap-2">
              {BRAND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBrand(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    brand === option.value
                      ? "border-[#4779FF] bg-blue-50 text-[#4779FF]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {brand === "custom" && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Logo URL
                </label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.svg"
                  className="text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter a URL to a hosted SVG or image file
                </p>
                {logoUrl && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Preview:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-8 max-w-[200px] object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Token Name
            </label>
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="USDC"
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Token symbol displayed in balances (e.g., USDC, PYUSD)
            </p>
          </div>
        </div>

        {/* Layout */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Layout</h2>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Show Sidebar
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Display the navigation sidebar in the demo
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showSidebar ? "bg-[#4779FF]" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showSidebar ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Theme Colors</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Primary Color */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="text-sm flex-1"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="text-sm flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
