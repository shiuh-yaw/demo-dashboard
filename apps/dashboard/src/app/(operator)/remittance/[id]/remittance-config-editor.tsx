"use client";

/**
 * Remittance Config Editor Component
 *
 * Client component for editing Remittance configurations.
 */

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateRemittanceConfig } from "@/lib/actions/remittance";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { Section, Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import type {
  StoredRemittanceConfig,
  RemittanceConfig,
} from "@/lib/types/dashboard";

interface RemittanceConfigEditorProps {
  config: StoredRemittanceConfig;
}

export function RemittanceConfigEditor({
  config: initialConfig,
}: RemittanceConfigEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(initialConfig.name);
  const [prospectId, setProspectId] = useState<string | null>(
    initialConfig.prospectId ?? null
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialConfig.config.theme?.primaryColor ?? "#1a56db"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialConfig.config.theme?.secondaryColor ?? "#1e40af"
  );
  const [logoUrl, setLogoUrl] = useState(
    initialConfig.config.branding?.logoUrl ?? ""
  );
  const [appName, setAppName] = useState(
    initialConfig.config.branding?.appName ?? ""
  );

  const demoUrl = demoThemeUrl("remittance", initialConfig.id);

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<RemittanceConfig> = {
        theme: {
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          appName: appName.trim() || undefined,
        },
      };

      const result = await updateRemittanceConfig(initialConfig.id, {
        name: name.trim(),
        config,
        prospectId,
      });

      if (result.success) {
        setToast("Remittance config saved");
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
            href="/remittance"
            className={ICON_ACTION}
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

      <div className="max-w-xl space-y-5">
        <Section title="Basic Info">
          <Field label="Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Remittance Config"
            />
          </Field>
          <Field label="Prospect">
            <ProspectPicker value={prospectId} onChange={setProspectId} />
          </Field>
        </Section>

        <Section title="Theme">
          <Field label="Primary Color">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1a56db"
              />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#1e40af"
              />
            </div>
          </Field>
        </Section>

        <Section title="Branding">
          <Field label="Logo URL">
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </Field>
          <Field label="App Name">
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Acme"
            />
            <p className="text-xs text-slate-500 mt-1">
              Browser-tab title (&quot;Acme - Remittance&quot;). Defaults to
              the prospect name.
            </p>
          </Field>
        </Section>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
