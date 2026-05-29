"use client";

/**
 * Header + state panels shared by the deposit and withdraw sub-flows.
 *
 * `SubFlowHeader` renders the eyebrow + title row at the top of each
 * sub-flow stage. `CreatingFlowPanel` is the spinner shown while a
 * Checkout is being minted server-side. `FlowErrorPanel` is the retry
 * surface when minting fails. Keeping the three colocated means a
 * visual tweak to the sub-flow chrome lands in one file.
 */

import { Button } from "@dynamic-demos/ui";
import { BackGlyph } from "@/components/icons";

export function SubFlowHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-5 border-b border-(--brand-border)">
      {/* Eyebrow row: back arrow inline with the eyebrow label,
          vertically centered. The arrow's intrinsic padding (-ml-1)
          shifts left so its center lines up with the title's left
          edge below. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 -ml-1 p-1 rounded hover:bg-(--brand-row-hover) transition-colors text-(--brand-muted) hover:text-(--brand-fg)"
        >
          <BackGlyph />
        </button>
        <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
          {eyebrow}
        </span>
      </div>
      {/* Title + subtitle: full-width, left-aligned (no indent from
          the back arrow). */}
      <h2 className="text-base font-semibold text-(--brand-fg) tracking-[-0.01em] leading-snug">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-(--brand-muted) leading-snug">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function CreatingFlowPanel({
  mode,
}: {
  mode: "deposit" | "withdraw";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 min-h-[16rem] text-center">
      <div className="w-9 h-9 rounded-full border-2 border-(--brand-border) border-t-(--brand-primary) animate-spin" />
      <p className="text-sm font-medium text-(--brand-fg)">
        Preparing your {mode}…
      </p>
      {/* "Flow" is the product surface (Dynamic Flow); the underlying
          server-side resource is internally called a Checkout but we
          stay in product-marketing terminology for user-facing copy. */}
      <p className="text-xs text-(--brand-muted) max-w-[28ch]">
        Spinning up a one-time Flow for this {mode}.
      </p>
    </div>
  );
}

export function FlowErrorPanel({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 min-h-[14rem] text-center">
        <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
          !
        </div>
        <p className="text-xs text-(--brand-muted) max-w-[34ch]">
          {message}
        </p>
      </div>
      <div className="flex gap-[7px] px-5 py-3 border-t border-(--brand-border)">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onRetry} className="flex-1">
          Try again
        </Button>
      </div>
    </div>
  );
}
