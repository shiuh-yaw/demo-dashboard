"use client";

/**
 * Logo candidates for a company website, for the operator to pick from.
 *
 * Every tile renders the asset twice - once on white, once on near-black -
 * because the assets that break the automatic pick are white-ink wordmarks.
 * On a single light swatch those look identical to a broken URL, which is
 * exactly how wellsfargo.com's correct wordmark read as an empty box.
 *
 * Candidates load on demand, not on mount: resolving them costs a page fetch
 * plus a HEAD per source, and most visits to this form never touch the logo.
 */

import { useState } from "react";
import { ImageOff, Loader2, Search } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { findLogoOptions } from "@/lib/actions/logo-options";

export interface LogoOptionsProps {
  /** Company website to search. The control hides itself without one. */
  websiteUrl: string;
  /** Currently selected logo, so the matching tile reads as chosen. */
  value: string;
  onSelect: (logo: string) => void;
}

export function LogoOptions({ websiteUrl, value, onSelect }: LogoOptionsProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [options, setOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  async function load() {
    setStatus("loading");
    setError(null);
    try {
      const result = await findLogoOptions(websiteUrl);
      setOptions(result.options);
      setError(result.error ?? null);
    } catch {
      setError("Could not look up logos");
    } finally {
      setStatus("done");
    }
  }

  const usable = options.filter((option) => !broken.has(option));

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={() => void load()}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        Find logos for this website
      </button>
    );
  }

  if (status === "loading") {
    return (
      <p className="mt-2 flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Looking for logos...
      </p>
    );
  }

  if (!usable.length) {
    return (
      <div className="mt-2 flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" />
        <span>{error ?? "No logos found for this website"}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-1.5 text-[11px] text-muted-foreground">
        {usable.length} found - each shown on light and dark, so a white logo is
        visible
      </p>
      <div className="flex flex-wrap gap-2">
        {usable.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-label={`Use logo option ${index + 1}`}
            aria-pressed={option === value}
            title={option}
            className={cn(
              "overflow-hidden rounded-md border transition-colors",
              option === value
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/60",
            )}
          >
            <div className="flex h-7 w-20 items-center justify-center bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option}
                alt=""
                className="max-h-full max-w-full object-contain"
                onError={() =>
                  setBroken((prev) => new Set(prev).add(option))
                }
              />
            </div>
            <div className="flex h-7 w-20 items-center justify-center bg-[#0f1115] p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
