"use client";

/**
 * Client-only islands for the landing page so the parent can stay an
 * RSC. Holds the source → destination connector + tiny icon wrappers.
 */

/**
 * Right-arrow glyph used on every "Docs" / "Read the docs →" affordance
 * across the app. Matches the geometry used by `components/icons.tsx`
 * ArrowRight, the code-panel `DocsLink`, and the scenario-card CTAs so
 * the "take the next step" family stays visually consistent.
 *
 * 14px to sit inline with the small "Docs" chip labels on the landing
 * page integration cards.
 */
export function DocsArrow() {
  return (
    <svg
      width="14"
      height="14"
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

/**
 * Right-arrow used in the scenario card "Run" CTA. Animates 2px to the
 * right when an ancestor `.group` is hovered — same affordance as the
 * "Pay with crypto" button.
 */
export function RunChevron() {
  return (
    <span className="inline-flex transition-transform group-hover:translate-x-0.5">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="block"
      >
        <path
          d="M2 7h10m0 0L8 3m4 4L8 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Source → destination connector. Compact (48 × 20) so the surrounding
 * source/destination slots get as much width as possible.
 *
 * Three-phase loop (1.8s) — send → travel → receive — paused until an
 * ancestor `.group` is hovered. Keyframes + the hover gate live in
 * `app/globals.css`.
 */
export function AnimatedFlowArrow() {
  const width = 48;
  const height = 20;
  const lineY = 10;
  const startX = 3;
  const endX = 38;
  const lineLen = endX - startX;

  return (
    <div className="flex items-center justify-center" aria-hidden>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <filter
            id="flow-soft-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Quiet dotted base track — always visible. */}
        <line
          x1={startX}
          y1={lineY}
          x2={endX}
          y2={lineY}
          stroke="var(--brand-primary)"
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeDasharray="1.5 2.5"
        />

        {/* Source anchor — always visible. */}
        <circle
          cx={startX}
          cy={lineY}
          r="1.6"
          fill="var(--brand-primary)"
        />

        {/* Source emanation ring. */}
        <circle
          cx={startX}
          cy={lineY}
          r="1.6"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1"
          opacity="0"
          className="flow-anim-source-pulse"
        />

        {/* Charging line. */}
        <line
          x1={startX}
          y1={lineY}
          x2={endX}
          y2={lineY}
          stroke="var(--brand-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={lineLen}
          strokeDashoffset={lineLen}
          opacity="0"
          className="flow-anim-line-draw"
        />

        {/* Leading particle halo. */}
        <circle
          cx={startX}
          cy={lineY}
          r="1.8"
          fill="var(--brand-primary)"
          filter="url(#flow-soft-glow)"
          opacity="0"
          className="flow-anim-particle-travel"
        />

        {/* Crisp leading dot. */}
        <circle
          cx={startX}
          cy={lineY}
          r="1.2"
          fill="var(--brand-primary)"
          opacity="0"
          className="flow-anim-particle-travel"
        />

        {/* Receive burst. */}
        <circle
          cx={endX}
          cy={lineY}
          r="0"
          fill="var(--brand-primary)"
          opacity="0"
          className="flow-anim-receive-burst"
        />

        {/* Landing chevron — dim at rest, flashes brighter on receive. */}
        <g className="flow-anim-chevron-flash">
          <path
            d={`M ${endX} ${lineY - 3.5} L ${endX + 4} ${lineY} L ${endX} ${lineY + 3.5}`}
            stroke="var(--brand-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
