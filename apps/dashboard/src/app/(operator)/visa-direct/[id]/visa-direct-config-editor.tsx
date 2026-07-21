"use client";

/**
 * Visa Direct Config Editor Component
 *
 * Client component for editing Visa Direct branding + theme configurations.
 */

import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateVisaDirectConfig } from "@/lib/actions/visa-direct";
import { Button } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { env } from "@/env";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type StoredVisaDirectConfig,
  type VisaDirectBranding,
  type VisaDirectConfig,
  type VisaDirectTheme,
} from "@/lib/types/dashboard";
import { VisaDirectForm } from "../components/visa-direct-form";
import { ProspectPicker } from "@/components/shared/prospect-picker";

const VISA_DIRECT_PROJECT_URL = env.NEXT_PUBLIC_VISA_DIRECT_PROJECT_URL;

interface VisaDirectConfigEditorProps {
  config: StoredVisaDirectConfig;
}

export function VisaDirectConfigEditor({
  config: initialConfig,
}: VisaDirectConfigEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(initialConfig.name);
  const [prospectId, setProspectId] = useState<string | null>(
    initialConfig.prospectId ?? null
  );
  const [branding, setBranding] = useState<VisaDirectBranding>({
    ...DEFAULT_VISA_DIRECT_CONFIG.branding,
    ...initialConfig.config.branding,
  });
  const [theme, setTheme] = useState<VisaDirectTheme>({
    ...DEFAULT_VISA_DIRECT_CONFIG.theme,
    ...initialConfig.config.theme,
  });

  const demoUrl = `${VISA_DIRECT_PROJECT_URL}/?theme=${initialConfig.id}`;

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<VisaDirectConfig> = { branding, theme };

      const result = await updateVisaDirectConfig(initialConfig.id, {
        name: name.trim(),
        config,
        prospectId,
      });

      if (result.success) {
        setToast("Visa Direct config saved");
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/visa-direct"
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
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
          >
            Open Demo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#4779FF] hover:bg-[#3968e8] text-white"
          >
            {isSaving ? "Saving..." : "Save Changes"}
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
