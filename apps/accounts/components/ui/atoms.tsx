"use client";

/**
 * Small presentational pieces shared by the account screens. Every colour
 * comes from the `--brand-*` contract so a prospect theme restyles them.
 */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@dynamic-demos/utils";
import { Button, CopyButton } from "@dynamic-demos/ui";

export type PillTone = "brand" | "neutral" | "you" | "active" | "pending";

const PILL_TONES: Record<PillTone, string> = {
  brand: "bg-(--brand-primary)/10 text-(--brand-primary)",
  neutral: "bg-(--brand-row-bg) text-(--brand-muted)",
  you: "bg-(--brand-accent)/10 text-(--brand-accent)",
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
};

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Monospaced identifier text - truncates rather than wrapping in dense rows. */
export function Mono({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "truncate font-mono text-xs text-(--brand-muted)",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** An id with a copy affordance - ids are what a reader needs to paste. */
export function CopyableId({
  value,
  label,
  prefix,
  className,
}: {
  value: string;
  label?: string;
  /** Rendered before the value but never copied, e.g. `ref:`. */
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <Mono title={value} className="min-w-0">
        {prefix ? `${prefix} ${value}` : value}
      </Mono>
      <CopyButton text={value} size="sm" label={label ?? "Copy ID"} />
    </span>
  );
}

export function SectionLabel({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-(--brand-fg)">
        {children}
        {count !== undefined && <Pill>{count}</Pill>}
      </span>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-(--brand-radius) border border-dashed border-(--brand-border) bg-(--brand-row-bg) px-3 py-5 text-center text-xs leading-relaxed text-(--brand-muted)">
      {children}
    </div>
  );
}

/**
 * One row in a list.
 *
 * A row with an `onClick` goes somewhere, so it draws its own chevron and
 * animates it - every screen was adding that by hand, which is how the account
 * list ended up without one. Pass `chevron={false}` for a row that acts in
 * place rather than navigating.
 */
export function Row({
  onClick,
  children,
  className,
  disabled,
  chevron = true,
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  chevron?: boolean;
}) {
  const base = cn(
    "group flex w-full shrink-0 items-center gap-3 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5 text-left",
    className,
  );

  if (!onClick) return <div className={base}>{children}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        // Motion, not just a colour swap - but nothing that grows the row.
        // These lists scroll (`overflow-y-auto`), so a hover lift is clipped
        // at the top edge of the viewport it sits in. Shadow and border tint
        // read as raised without changing the box, and the press scales DOWN,
        // which can never overflow.
        "cursor-pointer transition-all duration-150 ease-out",
        "hover:border-(--brand-primary)/30 hover:bg-(--brand-row-hover) hover:shadow-sm",
        "active:scale-[0.99] active:shadow-none",
        "disabled:cursor-default disabled:opacity-60 disabled:hover:shadow-none",
      )}
    >
      {children}
      {chevron && (
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-(--brand-muted) transition-transform duration-150 ease-out group-hover:translate-x-0.5"
        />
      )}
    </button>
  );
}

/**
 * The armed half of a destructive action: cancel, or commit in red.
 *
 * No "are you sure?" prose - at widget width it would squeeze the row's
 * identity out. A red verb next to Cancel is the question.
 */
export function ConfirmPair({
  label,
  pending,
  onCancel,
  onConfirm,
}: {
  label: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <Button
        variant="destructive"
        size="sm"
        loading={pending}
        onClick={onConfirm}
        autoFocus
      >
        {label}
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
    </span>
  );
}

