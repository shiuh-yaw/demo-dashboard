"use client";

import { useState } from "react";
import { Globe, Loader2, Sparkles } from "lucide-react";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { extractThemeFromUrl } from "@/lib/actions/extract-theme";
import type { WidgetConfig } from "@/lib/widget-config";

type AiStyleImportProps = {
  config: WidgetConfig;
  setConfig: React.Dispatch<React.SetStateAction<WidgetConfig | null>>;
  setToast: (message: string) => void;
  /** Pre-filled company URL - when provided, shows simplified UI */
  companyUrl?: string;
};

export function AiStyleImport({
  config,
  setConfig,
  setToast,
  companyUrl,
}: AiStyleImportProps) {
  const [importUrl, setImportUrl] = useState(config.branding?.aiStyleUrl || "");
  const [isImporting, setIsImporting] = useState(false);

  async function handleImport(url: string) {
    if (!url.trim() || isImporting) return;

    setIsImporting(true);
    try {
      const result = await extractThemeFromUrl(url.trim());
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to import theme");
      }

      const nextTheme = result.data.theme ?? {};
      const nextBranding = result.data.branding ?? {};

      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

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

  function handleImportFromUrl(e: React.FormEvent) {
    e.preventDefault();
    handleImport(importUrl);
  }

  // Simplified UI when company URL is provided
  if (companyUrl) {
    return (
      <div className="flex items-center justify-between bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-background flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-600 dark:text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-foreground">
              Import brand theme colors
            </p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">
              From {companyUrl}
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleImport(companyUrl)}
          disabled={isImporting}
          variant="outline"
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
      </div>
    );
  }

  // Full URL input form when no company URL
  return (
    <div className="bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-slate-600 dark:text-foreground mb-3">
        Import colors and branding from a website using AI
      </p>
      <form onSubmit={handleImportFromUrl} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-muted-foreground" />
          <Input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="example.com"
            className="h-11 pl-10 dark:bg-background dark:text-foreground dark:border-border dark:placeholder:text-muted-foreground"
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
