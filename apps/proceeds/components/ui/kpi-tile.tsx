import type { ReactNode } from "react";

/**
 * A small uppercase label, large numeric/value, and a one-line hint.
 * Used on the Payments dashboard's KPI strip.
 */
export interface KpiTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "positive" | "negative" | "pending" | "neutral";
  /**
   * Optional small action rendered to the right of the label — typically
   * a refresh icon button or status indicator. Mirrors the BALANCE label
   * pattern used in the stablecoin wallet card.
   */
  labelAction?: ReactNode;
}

const ACCENT_COLOR: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  positive: "var(--brand-status-completed-fg)",
  negative: "var(--brand-status-failed-fg)",
  pending: "var(--brand-status-pending-fg)",
  neutral: "var(--brand-fg)",
};

export function KpiTile({
  label,
  value,
  hint,
  accent = "neutral",
  labelAction,
}: KpiTileProps) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-body" style={{ padding: "20px 22px" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-(--brand-muted)">
            {label}
          </div>
          {labelAction && <div className="shrink-0">{labelAction}</div>}
        </div>
        <div
          className="text-[24px] font-semibold tracking-tight tabular-nums"
          style={{ color: ACCENT_COLOR[accent] }}
        >
          {value}
        </div>
        {hint && (
          <div className="text-[12px] text-(--brand-muted) mt-1">{hint}</div>
        )}
      </div>
    </div>
  );
}
