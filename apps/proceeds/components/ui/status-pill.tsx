/**
 * Rounded status pill. Uses the existing `--brand-status-*-{bg,fg}` CSS
 * custom properties so the palette stays in sync with the data-table badges.
 */
export type StatusKind = "paid" | "estimated" | "failed" | "neutral";

const KIND_STYLE: Record<StatusKind, { bg: string; fg: string; label: string }> =
  {
    paid: {
      bg: "var(--brand-status-completed-bg)",
      fg: "var(--brand-status-completed-fg)",
      label: "Paid",
    },
    estimated: {
      bg: "var(--brand-status-pending-bg)",
      fg: "var(--brand-status-pending-fg)",
      label: "Estimated",
    },
    failed: {
      bg: "var(--brand-status-failed-bg)",
      fg: "var(--brand-status-failed-fg)",
      label: "Failed",
    },
    neutral: {
      bg: "var(--brand-row-bg)",
      fg: "var(--brand-muted)",
      label: "Pending",
    },
  };

export interface StatusPillProps {
  kind: StatusKind;
  /** Override the default label for a kind. */
  label?: string;
}

export function StatusPill({ kind, label }: StatusPillProps) {
  const style = KIND_STYLE[kind];
  return (
    <span
      className="inline-flex items-center rounded-full text-[11px] font-medium"
      style={{ background: style.bg, color: style.fg, padding: "2px 10px" }}
    >
      {label ?? style.label}
    </span>
  );
}
