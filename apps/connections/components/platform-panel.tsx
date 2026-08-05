"use client";

/**
 * Two-axis switcher for the scenario page's right column: platform across
 * (Web / iOS / Android) and integration mode within (Basic / Headless).
 *
 * The content is the upstream integration guide itself - `DocsSection` from
 * components/docs-sections.tsx - not a paraphrase of it. Upstream's sections
 * already map onto these two axes, so the tabs replace that guide's left nav:
 *
 *   web              -> Web            (mode is not meaningful; toggle hidden)
 *   ios              -> iOS  / Basic
 *   ios-headless     -> iOS  / Headless
 *   android          -> Android / Basic
 *   android-headless -> Android / Headless
 *
 * React Native has no tab and no longer has any surface - the standalone /docs
 * route that carried it was removed. Its section is still authored, so adding a
 * tab back is a one-line change.
 *
 * Deep links: `?platform=ios&mode=headless`, or `#ios-headless`.
 */

import { useEffect, useState } from "react";

import { DocsSection, type DocsSources, type Section } from "./docs-sections";

export type Platform = "web" | "ios" | "android";
export type Mode = "basic" | "headless";

const PLATFORMS: Array<{ id: Platform; label: string }> = [
  { id: "web", label: "Web" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
];

const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: "basic", label: "Basic", hint: "Host the visible flow" },
  { id: "headless", label: "Headless", hint: "Your UI, no web chrome" },
];

/** Web is a single guide upstream - there is no headless variant of it. */
const HAS_MODES: Record<Platform, boolean> = {
  web: false,
  ios: true,
  android: true,
};

function sectionFor(platform: Platform, mode: Mode): Section {
  if (platform === "web") return "web";
  return mode === "headless"
    ? (`${platform}-headless` as Section)
    : (platform as Section);
}

function isPlatform(v: string): v is Platform {
  return PLATFORMS.some((p) => p.id === v);
}
function isMode(v: string): v is Mode {
  return MODES.some((m) => m.id === v);
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

// Secondary axis - deliberately lighter: no filled container, smaller type, and
// the active item marked by weight + colour rather than a raised chip.
const modeRow =
  "inline-flex items-center rounded-full border border-(--brand-border) overflow-hidden";
const modePill = (active: boolean) =>
  `px-2.5 py-1 text-[11px] font-medium transition-colors ${focusRing} ` +
  (active
    ? "bg-(--brand-fg) text-(--brand-surface)"
    : "text-(--brand-muted) hover:text-(--brand-fg)");

export function PlatformPanel({
  sources,
}: {
  sources: DocsSources;
}) {
  const [platform, setPlatform] = useState<Platform>("web");
  const [mode, setMode] = useState<Mode>("basic");

  // Read after mount so server and client agree on web/basic during hydration.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace("#", "").toLowerCase();
    const [hashPlatform, hashMode] = hash.split("-");

    const p = (params.get("platform") ?? hashPlatform ?? "").toLowerCase();
    if (p && isPlatform(p)) setPlatform(p);

    const m = (params.get("mode") ?? hashMode ?? "").toLowerCase();
    if (m && isMode(m)) setMode(m);
  }, []);

  const showModes = HAS_MODES[platform];

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

        {showModes ? (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--brand-muted)"
            >
              Mode
            </span>
            <div role="tablist" aria-label="Integration mode" className={modeRow}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => setMode(m.id)}
                  title={m.hint}
                  className={modePill(mode === m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/*
        Plain block, not a flex child per element: DocsSection returns a
        fragment, so without this wrapper every heading / paragraph / callout
        inside it becomes an item of the flex column above and picks up its
        `gap` on top of its own margin - the guide's rhythm doubles. Let
        upstream's margins own the vertical rhythm.
      */}
      <div>
        <DocsSection section={sectionFor(platform, mode)} sources={sources} />
      </div>
    </div>
  );
}
