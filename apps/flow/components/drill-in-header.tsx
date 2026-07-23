"use client";

/**
 * Header for widget drill-in screens (wallet list, exchange list,
 * deposit-address asset list): chevron back button to the LEFT of a
 * title that matches the category screen's title style. Navigation
 * stays inside the widget card.
 */

export function DrillInHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="w-7 h-7 -ml-1 shrink-0 flex items-center justify-center rounded-full text-[var(--brand-muted,#99a0ae)] hover:text-[var(--brand-fg,#0e121b)] hover:bg-[var(--brand-row-bg,#f6f8fa)] transition-colors cursor-pointer"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h3 className="text-base font-semibold text-[var(--brand-fg,#0e121b)] tracking-[-0.01em]">
        {title}
      </h3>
    </div>
  );
}
