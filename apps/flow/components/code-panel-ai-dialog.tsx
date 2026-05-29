"use client";

/**
 * "Scaffold with AI" chip + the Droplet `<Dialog>` it opens.
 *
 * The chip is intentionally not surfaced by the orchestrator right
 * now (`SHOW_AI_CHIP = false` in `code-panel.tsx`) but the components
 * stay wired so flipping the constant brings the affordance back
 * without touching the page call sites.
 *
 * `bg-(--brand-surface)` is layered on the DialogContent because
 * Droplet's default `bg-card` utility is generated from Droplet's
 * compiled dist, which Tailwind v4 doesn't scan from this app —
 * without an explicit background, the modal renders transparent over
 * the page content.
 */

import {
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from "@dynamic-labs-sdk/droplet";
import type { AiPromptContent } from "./code-panel-types";

/**
 * Pill-shaped CTA in the top-right of the panel header. Opens the
 * AI prompt dialog when clicked.
 */
export function AiChipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full",
        "px-3.5 py-1.5 text-xs font-semibold",
        "bg-gradient-to-br from-(--brand-primary) to-[#6f8dff]",
        "text-white shadow-[0_1px_2px_rgba(71,121,255,0.35)]",
        "hover:shadow-[0_2px_8px_rgba(71,121,255,0.45)]",
        "transition-shadow",
      )}
    >
      <span className="text-[11px] leading-none">✦</span>
      <span>Scaffold with AI</span>
    </button>
  );
}

export function AiPromptDialog({
  ai,
  open,
  onOpenChange,
}: {
  ai: AiPromptContent;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl gap-5 p-6 sm:p-7 bg-(--brand-surface) border border-(--brand-border) shadow-2xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-(--brand-primary) to-[#6f8dff] text-white text-[11px] leading-none">
              ✦
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-(--brand-primary)">
              {ai.eyebrow}
            </span>
          </div>
          <DialogTitle className="text-xl font-semibold text-(--brand-fg) tracking-[-0.01em]">
            {ai.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-(--brand-fg-secondary) leading-relaxed">
            {ai.sub}
          </DialogDescription>
        </div>

        <div className="rounded-2xl overflow-hidden border border-(--brand-border) bg-[#0d1117]">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.08]">
            <span className="text-[11px] text-white/55 font-mono">
              prompt.md
            </span>
            <CopyButton
              value={ai.rawPrompt}
              variant="ghost"
              size="icon-xs"
              className="text-white/55 hover:text-white hover:bg-white/[0.08]"
            />
          </div>
          <pre className="m-0 p-4 max-h-[55vh] overflow-auto text-[12.5px] leading-relaxed text-white/85 font-mono whitespace-pre-wrap">
            {ai.rawPrompt}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
