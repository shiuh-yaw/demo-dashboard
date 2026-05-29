/**
 * Shared SVG icon set for the scenario routes.
 *
 * Every icon is a 1.5px-stroked, `currentColor`-driven outline. They're
 * kept in one file so a glyph swap is a one-line change and the visual
 * language stays consistent across the checkout/deposit/withdraw
 * surfaces — no per-route arrow variants drifting apart.
 *
 * Each component renders a single `<svg>` with the documented intrinsic
 * size; the consumer controls color via a parent `text-…` utility.
 */

/** Right-pointing arrow. CTAs + row affordances. 16px. */
export function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Left-pointing arrow. "Back to …" links. 14px. */
export function ArrowLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M11 7H1m0 0l4-4M1 7l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Down-arrow for "Deposit" action — funds inbound. 14px. */
export function DownArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M7 2v10m0 0l-4-4m4 4l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Up-arrow for "Withdraw" action — funds outbound. 14px. */
export function UpArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M7 12V2m0 0l-4 4m4-4l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Smaller back glyph used inside sub-flow headers (the eyebrow row's
 * tap target). Same geometry as ArrowLeft but tinted via a muted text
 * class by default; consumers can override with a parent text utility.
 */
export function BackGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="text-(--brand-muted)"
    >
      <path
        d="M11 7H1m0 0l4-4M1 7l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Circular refresh arrow. 3/4 of a ring + arrowhead so the rotation
 * direction reads. Pass `spinning` while a refresh is in flight to
 * apply `animate-spin`.
 */
export function RefreshGlyph({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={spinning ? "block animate-spin" : "block"}
    >
      <path
        d="M12 7a5 5 0 1 1-1.46-3.54"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 2v3h-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Clipboard / checkmark toggle used inside address chips. Renders a
 * checkmark when `copied` is true (i.e. immediately after the user
 * triggers `navigator.clipboard.writeText`) and the two-rectangle
 * clipboard glyph otherwise.
 */
export function CopyGlyph({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M2 6.5L4.5 9L10 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="3.5"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2 8V2.5C2 1.94772 2.44772 1.5 3 1.5H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
