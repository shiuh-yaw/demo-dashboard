import type { ReactNode } from "react";

/**
 * Operator settings section (Dynamic-console style). Two-column on md+: the
 * title and description sit in a fixed-width left rail, the fields fill the
 * right. Flat (no nested card) with a faint hairline between stacked sections;
 * an optional `action` slot renders top-right, aligned with the title row.
 * Uses `last-of-type`/`first-of-type` (not `last-child`/`first-child`) so the
 * hairline still resolves correctly when a fixed-position sibling (e.g. the
 * UnsavedChangesBar or a Dialog) renders after the last section in the DOM.
 */

export interface SettingsSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section
      className={`grid gap-x-8 gap-y-4 border-b border-border-divider py-8 first-of-type:pt-0 last-of-type:border-b-0 md:grid-cols-[280px_1fr] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 md:block">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 md:hidden">{action}</div>}
      </div>
      <div className="min-w-0 space-y-4">
        {action && (
          <div className="hidden justify-end md:flex">{action}</div>
        )}
        {children}
      </div>
    </section>
  );
}
