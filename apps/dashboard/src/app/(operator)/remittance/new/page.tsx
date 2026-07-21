/**
 * New Remittance Config Page
 *
 * Form for creating a new Remittance configuration with theme and branding.
 */

"use client";

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createRemittanceConfig } from "@/lib/actions/remittance";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { Section, Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import type { RemittanceConfig } from "@/lib/types/dashboard";

export default function NewRemittanceConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1a56db");
  const [secondaryColor, setSecondaryColor] = useState("#1e40af");
  const [logoUrl, setLogoUrl] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsCreating(true);

    try {
      const config: Partial<RemittanceConfig> = {
        theme: {
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        branding: {
          logoUrl: logoUrl.trim() || undefined,
        },
      };
      const result = await createRemittanceConfig(name.trim(), config, prospectId);

      if (result.success) {
        router.push(`/remittance/${result.data.id}`);
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
            href="/remittance"
            className={ICON_ACTION}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            New Remittance Config
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/remittance">
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
        </Section>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
