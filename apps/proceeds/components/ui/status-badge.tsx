type BadgeStatus = "Active" | "Expired" | "New" | "Pending";

const statusStyles: Record<BadgeStatus, { background: string; color: string }> = {
  Active: {
    background: "var(--brand-status-completed-bg)",
    color: "var(--brand-status-completed-fg)",
  },
  Expired: {
    background: "var(--brand-status-failed-bg)",
    color: "var(--brand-status-failed-fg)",
  },
  New: {
    background: "var(--brand-status-pending-bg)",
    color: "var(--brand-status-pending-fg)",
  },
  Pending: {
    background: "var(--brand-status-pending-bg)",
    color: "var(--brand-status-pending-fg)",
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
