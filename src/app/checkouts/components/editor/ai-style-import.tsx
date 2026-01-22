"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractThemeFromUrl } from "@/lib/actions/extract-theme";
import type { WidgetConfig } from "@/lib/widget-config";

type AiStyleImportProps = {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig | null>>;
  setToast: (message: string) => void;
};

export function AiStyleImport({
  config,
  setConfig,
  setToast,
}: AiStyleImportProps) {
  const [importUrl, setImportUrl] = useState(config.branding?.aiStyleUrl || "");
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl.trim() || isImporting) return;

    setIsImporting(true);
    try {
      const result = await extractThemeFromUrl(importUrl.trim());
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to import theme");
      }

      const nextTheme = result.data.theme ?? {};
      const nextBranding = result.data.branding ?? {};

      const normalizedUrl = importUrl.startsWith("http")
        ? importUrl
        : `https://${importUrl}`;

      setConfig((prev) =>
        prev
          ? {
              ...prev,
              theme: { ...prev.theme, ...nextTheme },
              branding: {
                ...prev.branding,
                ...nextBranding,
                aiStyleUrl: normalizedUrl,
              },
            }
          : prev
      );
      setToast("Theme imported successfully!");
    } catch (err) {
      console.error("Failed to import theme:", err);
      setToast(err instanceof Error ? err.message : "Failed to import theme");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-slate-600 mb-3">
        Import colors and branding from a website using AI
      </p>
      <form onSubmit={handleImportFromUrl} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="example.com"
            className="h-11 pl-10"
            disabled={isImporting}
          />
        </div>
        <Button
          className="h-11 px-5"
          type="submit"
          disabled={!importUrl.trim() || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            "Import"
          )}
        </Button>
      </form>
    </div>
  );
}
