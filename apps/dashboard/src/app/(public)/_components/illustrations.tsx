/**
 * Landing-card hero illustrations — one per demo, in the visual language
 * of apps/flow's scenario illustrations (small hand-crafted SVGs, quiet
 * geometric product metaphors, 1.5 stroke weight, rounded corners).
 *
 * The dashboard landing has no `--brand-*` tokens, so these use literal
 * values: accent #4779FF on a white/slate palette.
 */

import type { ReactElement } from "react";

const ACCENT = "#4779FF";
const SURFACE = "#ffffff";
const BORDER = "#e2e8f0";
const MUTED_FILL = "#f1f5f9";
const FG = "#0f172a";

const MONO = "ui-monospace, SFMono-Regular, monospace";

/** Shared outer card frame — same footprint as flow's illustrations. */
function Frame() {
  return (
    <rect
      x="6"
      y="14"
      width="148"
      height="52"
      rx="10"
      fill={SURFACE}
      stroke={BORDER}
      strokeWidth="1.5"
    />
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="160"
      height="80"
      viewBox="0 0 160 80"
      fill="none"
      aria-hidden
      className="block"
    >
      {children}
    </svg>
  );
}

/** Wallet — a wallet body with an accent card sliding in and a snap clasp. */
export function WalletIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-wallet-card" x1="52" y1="0" x2="108" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Card sliding into the wallet (peeks above the body) */}
      <rect x="52" y="8" width="56" height="30" rx="5" fill="url(#ill-wallet-card)" />
      <rect x="59" y="14" width="18" height="4" rx="2" fill={SURFACE} fillOpacity="0.85" />
      {/* Wallet body — drawn over the card so the card sits inside */}
      <rect x="30" y="22" width="100" height="42" rx="10" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      {/* Masked address inside the wallet */}
      <text x="42" y="47" fontFamily={MONO} fontSize="11" fontWeight="600" fill={FG}>
        0x
      </text>
      <rect x="58" y="39" width="30" height="8" rx="2" fill={MUTED_FILL} />
      {/* Snap clasp overlapping the right edge, accent dot */}
      <rect x="112" y="34" width="26" height="18" rx="9" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      <circle cx="125" cy="43" r="3" fill={ACCENT} />
    </Svg>
  );
}

/** Trade — rising sparkline with a soft gradient fill under the curve. */
export function TradeIllustration() {
  const curve =
    "M18 52 C38 48 48 50 64 44 C80 38 92 44 106 36 C118 29 130 30 142 26";
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-trade-fill" x1="0" y1="26" x2="0" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <Frame />
      {/* Quiet gridlines */}
      <path d="M18 30 H142" stroke={BORDER} strokeWidth="1" strokeDasharray="2 5" />
      <path d="M18 44 H142" stroke={BORDER} strokeWidth="1" strokeDasharray="2 5" />
      {/* Area fill under the curve */}
      <path d={`${curve} L142 58 L18 58 Z`} fill="url(#ill-trade-fill)" />
      {/* Price line */}
      <path d={curve} stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Last-price marker */}
      <circle cx="142" cy="26" r="3" fill={SURFACE} stroke={ACCENT} strokeWidth="1.5" />
      {/* Skeleton price chip */}
      <rect x="18" y="22" width="24" height="7" rx="2" fill={MUTED_FILL} />
    </Svg>
  );
}

/** Earn — stacked bars growing in width + an accent up-arrow with "%". */
export function EarnIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-earn-bar" x1="18" y1="0" x2="94" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <Frame />
      {/* Stacked position bars — growing upward */}
      <rect x="18" y="49" width="48" height="7" rx="3.5" fill={MUTED_FILL} />
      <rect x="18" y="39" width="62" height="7" rx="3.5" fill={MUTED_FILL} />
      <rect x="18" y="29" width="76" height="7" rx="3.5" fill="url(#ill-earn-bar)" />
      {/* Yield up-arrow + "%" */}
      <path
        d="M118 40 L124 34 L130 40"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M124 34 V50" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <text x="135" y="40" fontFamily={MONO} fontSize="9" fontWeight="600" fill={ACCENT}>
        %
      </text>
    </Svg>
  );
}

/** Flow — order lines + a prominent accent pay pill and check badge. */
export function FlowIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-flow-pill" x1="18" y1="40" x2="118" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <Frame />
      {/* Order summary skeleton */}
      <rect x="18" y="24" width="44" height="7" rx="2" fill={MUTED_FILL} />
      <rect x="118" y="24" width="24" height="7" rx="2" fill={MUTED_FILL} />
      {/* Pay button */}
      <rect x="18" y="40" width="100" height="16" rx="8" fill="url(#ill-flow-pill)" />
      <rect x="48" y="46.5" width="40" height="3" rx="1.5" fill={SURFACE} fillOpacity="0.9" />
      {/* Confirmed badge */}
      <circle cx="134" cy="48" r="8" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      <path
        d="M130.5 48 L133 50.5 L137.5 45.5"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Remittance — send account → dashed accent path → receive account. */
export function RemittanceIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-remit-pill" x1="16" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Sender account */}
      <rect x="8" y="22" width="52" height="36" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      <text x="16" y="37" fontFamily={MONO} fontSize="10" fontWeight="600" fill={FG}>
        $
      </text>
      <rect x="24" y="29" width="26" height="7" rx="2" fill={MUTED_FILL} />
      <rect x="16" y="42" width="28" height="8" rx="4" fill="url(#ill-remit-pill)" />
      {/* Receiver account */}
      <rect x="100" y="22" width="52" height="36" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      <rect x="108" y="30" width="36" height="7" rx="2" fill={MUTED_FILL} />
      <rect x="108" y="42" width="24" height="7" rx="2" fill={MUTED_FILL} />
      {/* Transfer path */}
      <path d="M64 40 H86" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      <path
        d="M90 36 L96 40 L90 44"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Stablecoin Card — a virtual debit card: accent chip, contactless arcs, masked number, "$" funding badge. */
export function StablecoinCardIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="ill-card-chip" x1="42" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.95" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="ill-card-number" x1="96" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.9" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Card body */}
      <rect x="34" y="18" width="92" height="46" rx="8" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      {/* Chip */}
      <rect x="42" y="26" width="14" height="10" rx="2.5" fill="url(#ill-card-chip)" />
      {/* Contactless arcs */}
      <path
        d="M112 26 a8.5 8.5 0 0 1 0 12"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M107 29.5 a4 4 0 0 1 0 5"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Masked card number — last group highlighted */}
      <rect x="42" y="48" width="14" height="6" rx="3" fill={MUTED_FILL} />
      <rect x="60" y="48" width="14" height="6" rx="3" fill={MUTED_FILL} />
      <rect x="78" y="48" width="14" height="6" rx="3" fill={MUTED_FILL} />
      <rect x="96" y="48" width="14" height="6" rx="3" fill="url(#ill-card-number)" />
      {/* Stablecoin funding badge overlapping the card edge */}
      <circle cx="126" cy="52" r="9" fill={SURFACE} stroke={BORDER} strokeWidth="1.5" />
      <text x="123" y="55.5" fontFamily={MONO} fontSize="10" fontWeight="600" fill={ACCENT}>
        $
      </text>
    </Svg>
  );
}

/**
 * Slug → illustration lookup for the six landing demos. Resolve through
 * `getDemoIllustration` so unknown slugs fall back safely.
 */
export const DEMO_ILLUSTRATIONS: Record<string, () => ReactElement> = {
  wallet: WalletIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  flow: FlowIllustration,
  remittance: RemittanceIllustration,
  "stablecoin-card": StablecoinCardIllustration,
  checkouts: FlowIllustration,
  "visa-direct": StablecoinCardIllustration,
};

export function getDemoIllustration(slug: string): () => ReactElement {
  return DEMO_ILLUSTRATIONS[slug] ?? WalletIllustration;
}
