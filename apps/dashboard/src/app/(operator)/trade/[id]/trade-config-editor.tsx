"use client";

/**
 * Trade Config Editor Component
 *
 * Client component for editing Trade branding configurations.
 */

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateTradeConfig } from "@/lib/actions/trade";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { Section, Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import { demoThemeUrl } from "@/lib/share-links/launch-url";
import type {
  StoredTradeConfig,
  TradeConfig,
} from "@/lib/types/dashboard";

interface TradeConfigEditorProps {
  config: StoredTradeConfig;
}

export function TradeConfigEditor({
  config: initialConfig,
}: TradeConfigEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(initialConfig.name);
  const [prospectId, setProspectId] = useState<string | null>(
    initialConfig.prospectId ?? null
  );
  const [logoUrl, setLogoUrl] = useState(
    initialConfig.config.branding?.logoUrl ?? ""
  );
  const [appName, setAppName] = useState(
    initialConfig.config.branding?.appName ?? "NovaX"
  );

  const demoUrl = demoThemeUrl("trade", initialConfig.id);

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<TradeConfig> = {
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          appName: appName.trim() || undefined,
        },
      };

      const result = await updateTradeConfig(initialConfig.id, {
        name: name.trim(),
        config,
        prospectId,
      });

      if (result.success) {
        setToast("Trade config saved");
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
            href="/trade"
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
              placeholder="My Trade Config"
            />
          </Field>
          <Field label="Prospect">
            <ProspectPicker value={prospectId} onChange={setProspectId} />
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
              placeholder="NovaX"
            />
          </Field>
        </Section>

      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
