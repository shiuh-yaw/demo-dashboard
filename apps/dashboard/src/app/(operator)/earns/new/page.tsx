/**
 * New Earn Config Page
 *
 * Form for creating a new Earn configuration.
 */

"use client";

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createEarnConfig } from "@/lib/actions/earns";
import { Button } from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import type { EarnBrand, EarnConfig } from "@/lib/types/dashboard";

const BRAND_OPTIONS: { value: EarnBrand; label: string }[] = [
  { value: "dynamic", label: "Dynamic" },
  { value: "youtube", label: "YouTube" },
  { value: "meta", label: "Meta" },
  { value: "remitly", label: "Remitly" },
  { value: "custom", label: "Custom URL" },
];

export default function NewEarnConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [brand, setBrand] = useState<EarnBrand>("dynamic");
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [tokenName, setTokenName] = useState("USDC");
  const [pageTitle, setPageTitle] = useState("Earn");
  const [pageDescription, setPageDescription] = useState(
    "Manage your earnings, balance, and payouts.",
  );
  const [primaryColor, setPrimaryColor] = useState("#4779FF");
  const [accentColor, setAccentColor] = useState("#1967D2");
  const [showSidebar, setShowSidebar] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const config: Partial<EarnConfig> = {
        branding: {
          logo: brand,
          logoUrl: brand === "custom" ? logoUrl : undefined,
          appName: appName.trim() || undefined,
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

      const result = await createEarnConfig(name.trim(), config, prospectId);

      if (result.success) {
        router.push(`/earns/${result.data.id}`);
      } else {
        setError(result.error || "Failed to create config");
      }
    } catch (err) {
      setError("Failed to create config");
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
          href="/earns"
          className={ICON_ACTION}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          New Earn Config
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {/* Name */}
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
              Internal config name (dashboard only)
            </p>
          </div>

          {/* Prospect */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Prospect
            </label>
            <ProspectPicker value={prospectId} onChange={setProspectId} />
          </div>

          {/* Page Title */}
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

          {/* Page Description */}
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

          {/* Logo */}
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

          {/* Token Name */}
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

          {/* App Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              App Name
            </label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Acme"
              className="text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Browser-tab title (&quot;Acme - Earn&quot;). Defaults to the
              prospect name.
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

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href="/earns">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isCreating}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white"
          >
            {isCreating ? "Creating..." : "Create Config"}
          </Button>
        </div>
      </form>
    </div>
  );
}
