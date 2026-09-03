/**
 * New Exchange Config Page
 *
 * Form for creating a new Trade branding configuration.
 */

"use client";

import { useState } from "react";
import { ICON_ACTION } from "@/components/shared/icon-action";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createExchangeConfig } from "@/lib/actions/exchange";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/(operator)/checkouts/components/editor/toast";
import { Section, Field } from "@/app/(operator)/checkouts/components/editor/form-components";
import { ProspectPicker } from "@/components/shared/prospect-picker";
import type { ExchangeConfig } from "@/lib/types/dashboard";

export default function NewExchangeConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("Exchange");

  async function handleCreate() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsCreating(true);

    try {
      const config: Partial<ExchangeConfig> = {
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          appName: appName.trim() || undefined,
        },
      };
      const result = await createExchangeConfig(name.trim(), config, prospectId);

      if (result.success) {
        router.push(`/exchange/${result.data.id}`);
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
            href="/exchange"
            className={ICON_ACTION}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            New Exchange Config
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/exchange">
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
              placeholder="My Exchange Config"
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
              placeholder="Exchange"
            />
          </Field>
        </Section>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
