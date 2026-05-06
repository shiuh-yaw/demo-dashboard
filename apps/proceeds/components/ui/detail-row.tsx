import type { ReactNode } from "react";

export interface DetailRowProps {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  error?: string;
  action?: ReactNode;
  /** Show the value in muted text (for metadata rows like "Key custody"). */
  valueSubdued?: boolean;
}

/**
 * Row used in definition-list panels (Stablecoin payout settings, bank
 * account details). Three-column grid: label → (value + optional hint/error)
 * → action. Last-child border removed by the parent via `last:border-b-0`.
 */
export function DetailRow({
  label,
  value,
  hint,
  error,
  action,
  valueSubdued,
}: DetailRowProps) {
  return (
    <div
      className="grid items-start gap-6 px-7 py-4 border-b border-(--brand-row-divider) last:border-b-0"
      style={{ gridTemplateColumns: "200px 1fr auto" }}
    >
      <dt className="text-[13px] text-(--brand-muted) pt-[2px]">{label}</dt>
      <dd className="min-w-0">
        <div
          className={`text-[14px] ${
            valueSubdued ? "text-(--brand-muted)" : "text-(--brand-fg)"
          }`}
        >
          {value}
        </div>
        {(hint || error) && (
          <div
            className="text-[12px] mt-0.5"
            style={{
              color: error
                ? "var(--brand-status-failed-fg)"
                : "var(--brand-muted)",
            }}
          >
            {error ?? hint}
          </div>
        )}
      </dd>
      {action ? (
        <div className="pt-[2px] flex items-center justify-end">{action}</div>
      ) : (
        <div />
      )}
    </div>
  );
}
