"use client";

import { useRimauConfig } from "@/contexts/rimau-config-context";

/** The exchange's own mark: a prospect logo when branded, the Rimau wordmark otherwise. */
export function Wordmark({ small = false, light = false }: { small?: boolean; light?: boolean }) {
  const { branding, appName } = useRimauConfig();
  if (branding.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={branding.logoUrl} alt={`${appName} logo`} className={small ? "h-7 w-auto max-w-[180px] object-contain" : "h-9 w-auto max-w-[220px] object-contain"} />;
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`inline-grid place-items-center rounded-[10px] bg-brand text-brand-fg font-extrabold ${small ? "h-7 w-7 text-[13px]" : "h-9 w-9 text-[17px]"}`} aria-hidden>
        {appName.slice(0, 1).toUpperCase()}
      </span>
      <span className={`font-bold tracking-tight ${small ? "text-[15px]" : "text-[19px]"} ${light ? "text-white" : "text-ink"}`}>{appName}</span>
    </span>
  );
}
