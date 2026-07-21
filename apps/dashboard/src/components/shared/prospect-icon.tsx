"use client";

/**
 * Coast-style row icon for a Prospect: favicon when a domain is known,
 * initial-letter avatar otherwise. Pure presentational - no fetch beyond
 * the `img` tag itself.
 */

import { useState } from "react";

export interface ProspectIconProps {
  domain?: string | null;
  name: string;
  size?: number;
}

/** Strip protocol/path and lowercase a stored domain-ish value (bare domain or full URL). */
export function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null;
  const trimmed = domain.trim();
  if (trimmed.length === 0) return null;
  const withoutProtocol = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutProtocol.split(/[/?#]/)[0]?.trim() ?? "";
  return host.length > 0 ? host.toLowerCase() : null;
}

/** Google s2 favicon URL for a domain, always requested at sz=64 for crisp downscaling. */
export function faviconUrl(domain?: string | null): string | null {
  const host = normalizeDomain(domain);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

/** Uppercased first letter of the display name, used by the fallback avatar. */
export function fallbackLetter(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : "?";
}

export function ProspectIcon({ domain, name, size = 20 }: ProspectIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = faviconUrl(domain);
  const dimension = `${size}px`;

  if (src && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external favicon, not a build asset
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="rounded-md object-cover shrink-0 bg-slate-100"
        style={{ width: dimension, height: dimension }}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-500 font-medium shrink-0"
      style={{ width: dimension, height: dimension, fontSize: size * 0.5 }}
    >
      {fallbackLetter(name)}
    </span>
  );
}
