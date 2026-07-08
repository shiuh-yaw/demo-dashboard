"use client";

/**
 * AI Style Import for Brand Profiles
 *
 * Extracts colors and branding from a website URL using AI.
 * Reuses the extractThemeFromUrl action from checkouts.
 */

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { extractThemeFromUrl } from "@/lib/actions/extract-theme";
import type { BorderRadiusSize } from "@/lib/types/dashboard";

interface ExtractedBrandTheme {
  primaryColor?: string;
  accentColor?: string;
  borderRadius?: BorderRadiusSize;
  logoUrl?: string;
  name?: string;
}

interface AiStyleImportProps {
  initialUrl?: string;
  onImport: (theme: ExtractedBrandTheme) => void;
  setToast: (message: string) => void;
}

export function AiStyleImport({
  initialUrl = "",
  onImport,
  setToast,
}: AiStyleImportProps) {
  const [importUrl, setImportUrl] = useState(initialUrl);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFromUrl() {
    if (!importUrl.trim() || isImporting) return;

    setIsImporting(true);
    try {
      const result = await extractThemeFromUrl(importUrl.trim());
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to import theme");
      }

      const { theme, branding } = result.data;

      // Map the widget theme to brand settings
      const extractedTheme: ExtractedBrandTheme = {
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
        borderRadius: theme.borderRadius as BorderRadiusSize | undefined,
        logoUrl: branding.logo,
        name: branding.name,
      };

      onImport(extractedTheme);
      setToast("Theme imported successfully!");
    } catch (err) {
      console.error("Failed to import theme:", err);
      setToast(err instanceof Error ? err.message : "Failed to import theme");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-600 mb-3">
        Import colors and branding from a website using AI
      </p>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleImportFromUrl();
              }
            }}
            placeholder="https://example.com"
            className="h-10 pl-10 text-sm"
            disabled={isImporting}
          />
        </div>
        <Button
          className="h-10 px-4"
          type="button"
          onClick={handleImportFromUrl}
          disabled={!importUrl.trim() || isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Importing...
            </>
          ) : (
            "Import"
          )}
        </Button>
      </div>
    </div>
  );
}
