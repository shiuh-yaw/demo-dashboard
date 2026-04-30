/**
 * Rounded status pill. Uses the existing `--widget-status-*-{bg,fg}` CSS
 * custom properties so the palette stays in sync with the data-table badges.
 */
export type StatusKind = "paid" | "estimated" | "failed" | "neutral";

const KIND_STYLE: Record<StatusKind, { bg: string; fg: string; label: string }> =
  {
    paid: {
      bg: "var(--widget-status-completed-bg)",
      fg: "var(--widget-status-completed-fg)",
      label: "Paid",
    },
    estimated: {
      bg: "var(--widget-status-pending-bg)",
      fg: "var(--widget-status-pending-fg)",
      label: "Estimated",
    },
    failed: {
      bg: "var(--widget-status-failed-bg)",
      fg: "var(--widget-status-failed-fg)",
      label: "Failed",
    },
    neutral: {
      bg: "var(--widget-row-bg)",
      fg: "var(--widget-muted)",
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
