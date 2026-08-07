"use client";

/**
 * Segmented control for filtering a list in place - "All 10 / EVM 4 / SOL 2".
 *
 * Counts are part of the control rather than a separate line, because the
 * useful question ("is there anything on Solana?") is answered by the tab
 * before it is clicked.
 *
 * Caller decides whether to render it at all: a single-segment control is a
 * label wearing a button's clothes, so the usual guard is
 * `options.length > 1`.
 */

import { cn } from "@dynamic-demos/utils";

export interface SegmentedTabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  value: T;
  options: ReadonlyArray<SegmentedTabOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  /** Accessible name for the group, e.g. "Filter by chain". */
  "aria-label"?: string;
}

export function SegmentedTabs<T extends string = string>({
  value,
  options,
  onChange,
  className,
  "aria-label": ariaLabel,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-0.5 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-[calc(var(--brand-radius)-4px)] px-1 py-1.5 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97]",
              active
                ? "border border-(--brand-border) bg-(--brand-surface) text-(--brand-fg) shadow-sm"
                : "border border-transparent text-(--brand-muted) hover:text-(--brand-fg)",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ml-1 text-[10px]",
                  active ? "text-(--brand-muted)" : "text-(--brand-muted)/60",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
