/**
 * PanelNotice — the callout shell that frames CodePanel content,
 * generalized from apps/flow/components/code-panel-notices.tsx: soft
 * gradient card, accent uppercase eyebrow, muted dot-suffix, secondary
 * body. Eyebrow rides --brand-accent (flow uses --brand-primary; both
 * are Dynamic blue there, and accent stays visible under
 * charcoal-primary brands like wallet — D-030 role mapping).
 */

import type { ReactNode } from "react";

export interface PanelNoticeProps {
  /** Primary uppercase eyebrow (accent-coloured). */
  eyebrow: string;
  /** Optional muted dot-separator suffix (e.g. "no testnets"). */
  eyebrowSuffix?: string;
  /** Optional right-aligned affordance in the eyebrow row (e.g. DocsLink). */
  action?: ReactNode;
  /** Body under the eyebrow. */
  children: ReactNode;
}

export function PanelNotice({
  eyebrow,
  eyebrowSuffix,
  action,
  children,
}: PanelNoticeProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--brand-border) bg-gradient-to-br from-(--brand-row-bg) via-(--brand-row-bg) to-(--brand-surface) p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-(--brand-accent)">
            {eyebrow}
          </span>
          {eyebrowSuffix ? (
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-(--brand-muted)">
              · {eyebrowSuffix}
            </span>
          ) : null}
          {action ? <span className="ml-auto">{action}</span> : null}
        </div>
        <div className="text-[13px] leading-relaxed text-(--brand-fg-secondary)">
          {children}
        </div>
      </div>
    </div>
  );
}
