"use client";

/**
 * Switcher for the scenario page's right column: Web (the flow this demo runs,
 * documented inline) or Mobile (links to the canonical native guides).
 *
 * This used to be a two-axis switcher - platform across, Basic/Headless within
 * - over ~600 lines of native guide ported from upstream. That copy drifted:
 * it never gained Flutter or signing. The native guides now live only in the
 * Dynamic docs, so the mode axis has nothing left to select and is gone.
 *
 * Deep links: `?platform=mobile`, or `#mobile`. The old `?platform=ios` and
 * `#ios-headless` forms still resolve to Mobile rather than 404-ing a tab.
 */

import { useEffect, useState } from "react";

import { DocsSection } from "./docs-sections";

export type Platform = "web" | "mobile";

const PLATFORMS: Array<{ id: Platform; label: string }> = [
  { id: "web", label: "Web" },
  { id: "mobile", label: "Mobile" },
];

/**
 * Old deep links kept working: `?platform=ios`, `#android-headless` and the
 * rest all land on Mobile, which is where that content went.
 */
const LEGACY_PLATFORMS: Record<string, Platform> = {
  ios: "mobile",
  android: "mobile",
  rn: "mobile",
  "react-native": "mobile",
  flutter: "mobile",
};

function resolvePlatform(v: string): Platform | null {
  if (PLATFORMS.some((p) => p.id === v)) return v as Platform;
  return LEGACY_PLATFORMS[v] ?? null;
}

// Two axes need visible hierarchy, or adjacent identical pill rows read as one
// row of five options. Platform is primary (left, full-size); mode is secondary
// (right, smaller, labelled). `focus:outline-none` + an explicit focus-visible
// ring keeps a mouse click from leaving a ring that looks like a second
// selected state.
const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-primary) focus-visible:ring-offset-1";

// Primary axis - matches CodePanel's own tab row so they read as one system.
const platformRow =
  "inline-flex bg-(--brand-row-bg) border border-(--brand-border) rounded-full p-1";
const platformPill = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${focusRing} ` +
  (active
    ? "bg-(--brand-surface) text-(--brand-fg) shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    : "text-(--brand-muted) hover:text-(--brand-fg)");


export function PlatformPanel() {
  const [platform, setPlatform] = useState<Platform>("web");

  // Read after mount so server and client agree on `web` during hydration.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace("#", "").toLowerCase();
    // `#android-headless` -> "android": the mode suffix no longer selects
    // anything, but the platform half still tells us where to land.
    const [hashPlatform] = hash.split("-");
    const raw = (params.get("platform") ?? hashPlatform ?? "").toLowerCase();
    const resolved = raw ? resolvePlatform(raw) : null;
    if (resolved) setPlatform(resolved);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div role="tablist" aria-label="Platform" className={platformRow}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={platform === p.id}
              onClick={() => setPlatform(p.id)}
              className={platformPill(platform === p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

      </div>

      {/*
        Plain block, not a flex child per element: DocsSection returns a
        fragment, so without this wrapper every heading / paragraph / callout
        inside it becomes an item of the flex column above and picks up its
        `gap` on top of its own margin - the guide's rhythm doubles. Let
        upstream's margins own the vertical rhythm.
      */}
      <div>
        <DocsSection section={platform} />
      </div>
    </div>
  );
}
