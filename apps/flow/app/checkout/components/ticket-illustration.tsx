/**
 * Landing-card hero illustration for the checkout scenario — a
 * stylised event ticket. Sized to fit the 176px hero region inside
 * `<ScenarioCard />`.
 */

export function TicketIllustration() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient
          id="ticket-grad"
          x1="0"
          y1="0"
          x2="120"
          y2="80"
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
            stopOpacity="0.65"
          />
        </linearGradient>
      </defs>
      <path
        d="M8 18h104a4 4 0 0 1 4 4v8a6 6 0 0 0 0 12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8a6 6 0 0 0 0-12v-8a4 4 0 0 1 4-4Z"
        fill="url(#ticket-grad)"
      />
      <path
        d="M44 18v44"
        stroke="var(--brand-surface)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <circle
        cx="68"
        cy="32"
        r="3"
        fill="var(--brand-surface)"
        fillOpacity="0.9"
      />
      <rect
        x="60"
        y="42"
        width="44"
        height="2"
        rx="1"
        fill="var(--brand-surface)"
        fillOpacity="0.85"
      />
      <rect
        x="60"
        y="48"
        width="32"
        height="2"
        rx="1"
        fill="var(--brand-surface)"
        fillOpacity="0.6"
      />
    </svg>
  );
}
