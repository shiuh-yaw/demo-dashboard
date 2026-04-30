type BadgeStatus = "Active" | "Expired" | "New" | "Pending";

const statusStyles: Record<BadgeStatus, { background: string; color: string }> = {
  Active: {
    background: "var(--widget-status-completed-bg)",
    color: "var(--widget-status-completed-fg)",
  },
  Expired: {
    background: "var(--widget-status-failed-bg)",
    color: "var(--widget-status-failed-fg)",
  },
  New: {
    background: "var(--widget-status-pending-bg)",
    color: "var(--widget-status-pending-fg)",
  },
  Pending: {
    background: "var(--widget-status-pending-bg)",
    color: "var(--widget-status-pending-fg)",
  },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const s = statusStyles[status];
  return (
    <span
      className="inline-flex items-center rounded-full text-xs font-medium"
      style={{ background: s.background, color: s.color, padding: "3px 12px" }}
    >
      {status}
    </span>
  );
}
