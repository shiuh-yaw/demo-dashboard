/**
 * Landing-card hero illustration for the withdraw scenario.
 *
 * A filled "platform balance" pill, an arrow, and an empty
 * destination pill — telegraphs the "value leaves the platform" story
 * before the user clicks into the flow.
 */

export function WithdrawIllustration() {
  return (
    <svg
      width="160"
      height="80"
      viewBox="0 0 160 80"
      fill="none"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient
          id="withdraw-bar"
          x1="0"
          y1="0"
          x2="160"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="var(--brand-primary)"
            stopOpacity="0.85"
          />
          <stop
            offset="100%"
            stopColor="var(--brand-primary)"
            stopOpacity="0.45"
          />
        </linearGradient>
      </defs>
      <rect
        x="6"
        y="14"
        width="148"
        height="52"
        rx="10"
        fill="var(--brand-surface)"
        stroke="var(--brand-border)"
        strokeWidth="1.5"
      />
      <rect
        x="18"
        y="32"
        width="44"
        height="16"
        rx="8"
        fill="url(#withdraw-bar)"
      />
      <path
        d="M70 40 H100"
        stroke="var(--brand-primary)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M96 36 L100 40 L96 44"
        stroke="var(--brand-primary)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect
        x="108"
        y="32"
        width="34"
        height="16"
        rx="8"
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
