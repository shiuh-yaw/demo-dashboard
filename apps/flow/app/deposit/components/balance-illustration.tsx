/**
 * Landing-card hero illustration for the deposit scenario — a
 * stylised "balance bar" (empty meter + skeleton numerals + up-arrow
 * suggesting funds inbound). Sized to fit the 176px hero region
 * inside `<ScenarioCard />`.
 */

export function BalanceIllustration() {
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
          id="balance-bar"
          x1="0"
          y1="0"
          x2="160"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="var(--brand-primary)"
            stopOpacity="0.95"
          />
          <stop
            offset="100%"
            stopColor="var(--brand-primary)"
            stopOpacity="0.55"
          />
        </linearGradient>
      </defs>
      {/* Outer card frame */}
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
      {/* Balance bar — empty rail + ~30% fill */}
      <rect
        x="18"
        y="42"
        width="124"
        height="6"
        rx="3"
        fill="var(--brand-row-bg)"
      />
      <rect
        x="18"
        y="42"
        width="38"
        height="6"
        rx="3"
        fill="url(#balance-bar)"
      />
      {/* "$" mark + skeleton numerals */}
      <text
        x="18"
        y="32"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize="11"
        fontWeight="600"
        fill="var(--brand-fg)"
      >
        $
      </text>
      <rect
        x="28"
        y="24"
        width="32"
        height="8"
        rx="2"
        fill="var(--brand-row-bg)"
      />
      {/* Up-arrow accent — funds inbound */}
      <path
        d="M132 30 L138 24 L144 30"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M138 24 V36"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Dotted progression below the bar */}
      <circle cx="18" cy="58" r="1.5" fill="var(--brand-muted)" opacity="0.5" />
      <circle cx="30" cy="58" r="1.5" fill="var(--brand-muted)" opacity="0.4" />
      <circle cx="42" cy="58" r="1.5" fill="var(--brand-muted)" opacity="0.3" />
    </svg>
  );
}
