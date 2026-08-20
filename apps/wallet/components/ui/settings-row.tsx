"use client";

/**
 * One row anatomy for every setting: boxed icon, title, description,
 * trailing control. Every settings surface composes these so the stacks
 * read as one component.
 */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@dynamic-demos/utils";

export const settingsRowIconClass = "h-[18px] w-[18px] text-(--brand-accent)";

/** The one paragraph a settings screen gets before its stack of rows. */
export function SettingsIntro({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-(--brand-muted)">{children}</p>
  );
}

const rowFrameClass =
  "flex w-full items-center gap-3 rounded-(--brand-radius) border border-(--brand-border) p-3 text-left";

/** 36px bordered square. The only place a settings icon may live. */
export function SettingsRowIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-(--brand-border) bg-(--brand-surface)">
      {children}
    </div>
  );
}

/** Trailing affordance for rows that open another screen. */
export function DrillInChevron() {
  return (
    <ChevronRight
      className="h-4 w-4 shrink-0 text-(--brand-muted) transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      strokeWidth={1.5}
      aria-hidden
    />
  );
}

function RowBody({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <>
      <SettingsRowIcon>{icon}</SettingsRowIcon>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-(--brand-fg)">
          {title}
        </div>
        {/* One line, always: these rows are a scannable stack, not prose. */}
        <p className="truncate text-xs text-(--brand-muted)">{description}</p>
      </div>
      {action}
    </>
  );
}

export function SettingsRow({
  icon,
  title,
  description,
  action,
  onClick,
  disabled,
  dashed,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Marks a demo-only control, not a real product setting. */
  dashed?: boolean;
}) {
  const body = (
    <RowBody
      icon={icon}
      title={title}
      description={description}
      action={action}
    />
  );
  const className = cn(rowFrameClass, dashed && "border-dashed");

  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        className,
        "group cursor-pointer transition-colors hover:bg-(--brand-row-hover) disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {body}
    </button>
  );
}

/** A row that opens the next screen. */
export function SettingsDrillInRow(
  props: Omit<Parameters<typeof SettingsRow>[0], "action" | "onClick"> & {
    onClick: () => void;
  },
) {
  return <SettingsRow {...props} action={<DrillInChevron />} />;
}

/**
 * Same row, in a box that can grow a second section (a confirm, a result).
 * The rule is inset to the content so both sections share one left margin.
 */
export function SettingsRowCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-(--brand-radius) border border-(--brand-border)">
      <div className="flex items-center gap-3 p-3">
        <RowBody
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </div>
      {children ? (
        <div className="px-3 pb-3">
          <div className="mb-3 border-t border-(--brand-border)" />
          {children}
        </div>
      ) : null}
    </div>
  );
}
