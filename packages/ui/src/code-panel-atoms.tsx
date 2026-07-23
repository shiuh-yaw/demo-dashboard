"use client";

/**
 * Shared atoms for <CodePanel /> panes — generalized from
 * apps/flow/components/code-panel-atoms.tsx with droplet's CopyButton
 * swapped for this package's own.
 *
 * The dark code-frame chrome (#0d1117 + white-alpha strip) is
 * intentionally theme-independent — code blocks read as "terminal"
 * under any brand — and is the one sanctioned hex exception in this
 * package (see AGENTS.md).
 *
 * Consumers must include the `.shiki-block` CSS in their app globals
 * (line numbers, padding, transparent background); see the wallet or
 * flow globals.css for the canonical block.
 */

import { CopyButton } from "./copy-button";

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
          text={rawCode}
          size="sm"
          className="text-white/55 hover:text-white hover:bg-white/[0.08]"
        />
      </div>
      <div className="shiki-block" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function DocsLink({
  href,
  label = "Docs",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group/docs inline-flex items-center gap-1 text-[12px] font-medium text-(--brand-accent) transition-opacity hover:opacity-80 shrink-0"
    >
      {label}
      <span className="transition-transform group-hover/docs:translate-x-0.5">
        <DocsArrow />
      </span>
    </a>
  );
}

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
