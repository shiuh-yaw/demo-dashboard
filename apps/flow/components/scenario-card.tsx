/**
 * Pre-flow landing card shared by all three scenario routes.
 *
 * Each route lands the user on a route-specific "product surface" —
 * the merchant's checkout item, the platform's deposit screen, the
 * platform's wallet — that the user taps to enter the actual widget
 * flow. The visual shape is identical across all three: a tall
 * gradient hero with a dot pattern and a centered illustration, then
 * a body with an eyebrow, title, optional trailing slot (e.g. a
 * price), prose, and a primary CTA.
 *
 * Render-prop API: the consumer hands in an `illustration` element to
 * place inside the hero region. Keep illustrations centered in a
 * `120×80`-ish viewBox so they sit visually consistent across routes.
 */

import type { ReactNode } from "react";
import { ArrowRight } from "./icons";

export interface ScenarioCardProps {
  /**
   * Small uppercase label above the title (e.g. "Demo purchase",
   * "Platform balance", "Cash out"). Roughly 1-2 words.
   */
  eyebrow: string;
  /** Card heading — sentence-case, no terminal period. */
  title: string;
  /**
   * Body copy below the heading. One sentence, ~25-30 words max.
   * Plain text so the card's typography stays uniform across routes.
   */
  body: string;
  /** Primary action button label (e.g. "Pay with crypto"). */
  ctaLabel: string;
  /** Primary action handler — fires when the CTA is clicked. */
  onCta: () => void;
  /**
   * Centered illustration placed in the gradient hero region. Keep
   * roughly 120×80 so it sits visually balanced inside the 176px
   * hero band; consumers control the actual viewBox.
   */
  illustration: ReactNode;
  /**
   * Optional right-aligned slot next to the eyebrow + title (e.g. a
   * price chip on the checkout demo card). When absent the title
   * region stretches to the card edge.
   */
  trailingHeader?: ReactNode;
}

export function ScenarioCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  onCta,
  illustration,
  trailingHeader,
}: ScenarioCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-(--brand-border) bg-(--brand-surface) shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div
        className="relative h-44"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--brand-surface)) 0%, var(--brand-surface) 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand-fg) 6%, transparent) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {illustration}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-(--brand-muted) font-medium">
              {eyebrow}
            </span>
            <h3 className="text-base font-semibold text-(--brand-fg) tracking-[-0.01em]">
              {title}
            </h3>
          </div>
          {trailingHeader && <div className="shrink-0">{trailingHeader}</div>}
        </div>

        <p className="text-xs leading-relaxed text-(--brand-fg-secondary)">
          {body}
        </p>

        <button
          type="button"
          onClick={onCta}
          className="group mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-(--brand-primary) px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-(--brand-primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-primary) focus-visible:ring-offset-2"
        >
          {ctaLabel}
          <span className="transition-transform group-hover:translate-x-0.5">
            <ArrowRight />
          </span>
        </button>
      </div>
    </article>
  );
}
