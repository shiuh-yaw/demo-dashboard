"use client";

/**
 * New Visa Direct Config Page
 *
 * Form for creating a new Visa Direct branding + theme configuration.
 */

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createVisaDirectConfig } from "@/lib/actions/visa-direct";
import { Button } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type VisaDirectBranding,
  type VisaDirectConfig,
  type VisaDirectTheme,
} from "@/lib/types/dashboard";
import { VisaDirectForm } from "../components/visa-direct-form";
import { ProspectPicker } from "@/components/shared/prospect-picker";

export default function NewVisaDirectConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [branding, setBranding] = useState<VisaDirectBranding>(
    DEFAULT_VISA_DIRECT_CONFIG.branding
  );
  const [theme, setTheme] = useState<VisaDirectTheme>(
    DEFAULT_VISA_DIRECT_CONFIG.theme
  );

  async function handleCreate() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsCreating(true);

    try {
      const config: Partial<VisaDirectConfig> = { branding, theme };
      const result = await createVisaDirectConfig(name.trim(), config, prospectId);

      if (result.success) {
        router.push(`/visa-direct/${result.data.id}`);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/visa-direct"
            className={ICON_ACTION}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            New Visa Direct Config
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/visa-direct">
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

      <div className="max-w-xl mb-5">
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          Prospect
        </label>
        <ProspectPicker value={prospectId} onChange={setProspectId} />
      </div>

      <VisaDirectForm
        name={name}
        onNameChange={setName}
        branding={branding}
        onBrandingChange={setBranding}
        theme={theme}
        onThemeChange={setTheme}
        onResetDefaults={() => {
          setBranding(DEFAULT_VISA_DIRECT_CONFIG.branding);
          setTheme(DEFAULT_VISA_DIRECT_CONFIG.theme);
        }}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
