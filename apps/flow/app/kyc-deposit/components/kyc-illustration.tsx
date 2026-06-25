/**
 * Illustration for the KYC deposit landing card.
 * Shield + checkmark motif representing identity verification.
 */
export function KycIllustration() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M60 8L30 20v20c0 16.57 12.83 32.07 30 36 17.17-3.93 30-19.43 30-36V20L60 8z"
        fill="color-mix(in srgb, var(--brand-primary) 12%, transparent)"
        stroke="var(--brand-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 40l8 8 16-16"
        stroke="var(--brand-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
