"use client";

/**
 * Shared atoms used across every pane of `<CodePanel />`:
 *
 *   - `CodeFrame`   wraps a Shiki-highlighted code block with a dark
 *                   filename header + copy button.
 *   - `DocsLink`    "Read the docs →" anchor styled to match the
 *                   scenario-CTA arrow family.
 *   - `renderProse` cheap markdown subset that turns `backtick` spans
 *                   inside step / helper / event prose into inline
 *                   `<code>` chips.
 *
 * Each pane (stepper, helpers, webhooks, ai-dialog) imports from here
 * so a tweak to the dark code frame or the docs-link arrow lands in
 * one place.
 */

import { CopyButton } from "@dynamic-labs-sdk/droplet";
import type { ReactNode } from "react";

/**
 * Dark code-block wrapper used by the integration stepper, helper
 * cards, and webhook event cards. The filename strip + copy button
 * mirror the same dark-on-light treatment used inside the AI prompt
 * dialog so visitors recognise the language.
 */
export function CodeFrame({
  filename,
  html,
  rawCode,
}: {
  filename: string;
  html: string;
  rawCode: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-(--brand-border) bg-[#0d1117]">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.08]">
        <span className="text-[11px] text-white/55 font-mono">{filename}</span>
        <CopyButton
          value={rawCode}
          variant="ghost"
          size="icon-xs"
          className="text-white/55 hover:text-white hover:bg-white/[0.08]"
        />
      </div>
      <div
        className="shiki-block"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * "Read the docs →" anchor — small primary-coloured pill rendered in
 * the top-right of every step / helper / webhook card. The arrow
 * slides right on hover, matching the scenario-card CTA, the
 * route-chip arrow, and the dashboard action-row arrows so the
 * "take the next step" affordance reads as one family.
 */
export function DocsLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group/docs inline-flex items-center gap-1 text-[12px] font-medium text-(--brand-primary) hover:text-(--brand-primary-hover) transition-colors shrink-0"
    >
      Read the docs
      <span className="transition-transform group-hover/docs:translate-x-0.5">
        <DocsArrow />
      </span>
    </a>
  );
}

/**
 * Right-arrow glyph matching the one on the scenario CTAs (e.g.
 * `Pay with crypto →`) and the ChipArrow on the route chips, so the
 * docs link reads as part of the same family of "take the next step"
 * affordances.
 */
function DocsArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Render a prose string with `backtick`-delimited spans as inline
 * code chips. Cheap markdown subset — only inline code is supported,
 * no bold / italic / links — to keep the prose strings honest about
 * what they can carry.
 */
export function renderProse(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-(--brand-row-bg) border border-(--brand-border) text-(--brand-fg)"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
