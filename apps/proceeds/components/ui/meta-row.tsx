import type { ReactNode } from "react";

export interface MetaRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Left-column width. Defaults to 160px. */
  labelWidth?: number;
}

/**
 * Label + value pair used inside cards and hero panels. Grid-based so values
 * wrap cleanly when long (e.g. transaction hashes).
 */
export function MetaRow({ label, value, labelWidth = 160 }: MetaRowProps) {
  return (
    <div
      className="grid items-baseline gap-4"
      style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
    >
      <div className="text-[12px] text-(--brand-muted)">{label}</div>
      <div className="text-[13px] text-(--brand-fg)">{value}</div>
    </div>
  );
}
