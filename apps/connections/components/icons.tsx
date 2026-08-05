/**
 * Chevrons and the hover-reveal wrappers built on them.
 *
 * Deliberately NOT a "use client" module and free of hooks, so the callback page
 * (a Server Component) can render the same affordances as the widget without
 * pulling the widget's client chunk in behind them.
 *
 * `RowChevron` collapses to zero width at rest. On the wallet list only
 * multi-chain rows have a chevron, and reserving the space pushed those rows'
 * "Installed" pill ~26px left of the pill on rows without one, so the pills
 * stopped lining up. At zero width every pill sits flush right; on hover the
 * chevron expands and eases the pill left to make room. Requires `group` on the
 * row, and no-ops under `prefers-reduced-motion`.
 *
 * Buttons deliberately carry no chevron: pinned at the edge of a full-width CTA
 * it reads as detached from the centred label rather than as part of it.
 */

export function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Row-level "this goes somewhere" chevron. Needs `group` on the row. */
export function RowChevron() {
  return (
    <span
      aria-hidden="true"
      className="-ml-2 flex w-0 -translate-x-1 items-center overflow-hidden text-(--brand-muted) opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:w-[18px] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:ml-0 group-focus-visible:w-[18px] group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      <ChevronRight />
    </span>
  );
}

