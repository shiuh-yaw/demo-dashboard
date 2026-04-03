/**
 * New Trade Config Page
 *
 * Form for creating a new Trade branding configuration.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createTradeConfig } from "@/lib/actions/trade";
import { Button, Input } from "@dynamic-demos/ui";
import { Toast } from "@/app/checkouts/components/editor/toast";
import { Section, Field } from "@/app/checkouts/components/editor/form-components";
import type { TradeConfig } from "@/lib/types/dashboard";

export default function NewTradeConfigPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("NovaX");

  async function handleCreate() {
    if (!name.trim()) {
      setToast("Name is required");
      return;
    }

    setIsCreating(true);

    try {
      const config: Partial<TradeConfig> = {
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          appName: appName.trim() || undefined,
        },
      };
      const result = await createTradeConfig(name.trim(), config);

      if (result.success) {
        router.push(`/trade/${result.data.id}`);
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
            href="/trade"
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            New Trade Config
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/trade">
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
              placeholder="My Trade Config"
            />
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
