"use client";

/**
 * Trade Config Editor Component
 *
 * Client component for editing Trade configurations.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { updateTradeConfig } from "@/lib/actions/trade";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/checkouts/components/editor/toast";
import { Section, Field } from "@/app/checkouts/components/editor/form-components";
import { env } from "@/env";
import type {
  StoredTradeConfig,
  TradeConfig,
} from "@/lib/types/dashboard";

const TRADE_PROJECT_URL = env.NEXT_PUBLIC_TRADE_PROJECT_URL;

interface TradeConfigEditorProps {
  config: StoredTradeConfig;
}

export function TradeConfigEditor({
  config: initialConfig,
}: TradeConfigEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(initialConfig.name);
  const [primaryColor, setPrimaryColor] = useState(
    initialConfig.config.theme?.primaryColor ?? "#00FF88"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialConfig.config.theme?.secondaryColor ?? "#00CC6A"
  );
  const [logoUrl, setLogoUrl] = useState(
    initialConfig.config.branding?.logoUrl ?? ""
  );
  const [appName, setAppName] = useState(
    initialConfig.config.branding?.appName ?? "NovaX"
  );

  const demoUrl = `${TRADE_PROJECT_URL}/t/${initialConfig.id}`;

  async function handleSave() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsSaving(true);

    try {
      const config: Partial<TradeConfig> = {
        theme: {
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          appName: appName.trim() || undefined,
        },
      };

      const result = await updateTradeConfig(initialConfig.id, {
        name: name.trim(),
        config,
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

      <div className="max-w-xl space-y-5">
        <Section title="Basic Info">
          <Field label="Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Trade Config"
            />
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
                placeholder="#00FF88"
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
                placeholder="#00CC6A"
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
              placeholder="NovaX"
            />
          </Field>
        </Section>

        {/* Live color preview */}
        <Section title="Preview">
          <div className="flex gap-3 items-center">
            <div
              className="w-16 h-16 rounded-lg border border-slate-200"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="w-16 h-16 rounded-lg border border-slate-200"
              style={{ backgroundColor: secondaryColor }}
            />
            <div className="text-xs text-slate-500">
              <p>Primary: {primaryColor}</p>
              <p>Secondary: {secondaryColor}</p>
            </div>
          </div>
        </Section>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
