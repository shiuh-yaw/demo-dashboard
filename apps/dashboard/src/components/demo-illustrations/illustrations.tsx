/**
 * Operator-owned demo illustrations: same artwork as the public
 * `(public)/_components/illustrations.tsx`, recolored via CSS CLASSES whose
 * fill/stroke/stop-color are defined under the operator surface in globals.css
 * (light + dark). The public file is never imported or modified.
 */

import type { ReactElement } from "react";

const MONO = "ui-monospace, SFMono-Regular, monospace";

// Accent gradient stop; stop-color comes from the .di-accent-stop class rule.
function accentStop(offset: string, opacity: number): ReactElement {
  return <stop className="di-accent-stop" offset={offset} stopOpacity={opacity} />;
}

function Frame() {
  return (
    <rect
      x="6"
      y="14"
      width="148"
      height="52"
      rx="10"
      className="di-surface-box"
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

/** Wallet - a wallet body with an accent card sliding in and a snap clasp. */
export function WalletIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-wallet-card" x1="52" y1="0" x2="108" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.95)}
          {accentStop("100%", 0.6)}
        </linearGradient>
      </defs>
      <rect x="52" y="8" width="56" height="30" rx="5" fill="url(#op-ill-wallet-card)" />
      <rect x="59" y="14" width="18" height="4" rx="2" className="di-surface" fillOpacity="0.85" />
      <rect x="30" y="22" width="100" height="42" rx="10" className="di-surface-box" strokeWidth="1.5" />
      <text x="42" y="47" fontFamily={MONO} fontSize="11" fontWeight="600" className="di-fg">
        0x
      </text>
      <rect x="58" y="39" width="30" height="8" rx="2" className="di-muted" />
      <rect x="112" y="34" width="26" height="18" rx="9" className="di-surface-box" strokeWidth="1.5" />
      <circle cx="125" cy="43" r="3" className="di-accent" />
    </Svg>
  );
}

/** Trade - rising sparkline with a soft gradient fill under the curve. */
export function TradeIllustration() {
  const curve =
    "M18 52 C38 48 48 50 64 44 C80 38 92 44 106 36 C118 29 130 30 142 26";
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-trade-fill" x1="0" y1="26" x2="0" y2="58" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.25)}
          {accentStop("100%", 0)}
        </linearGradient>
      </defs>
      <Frame />
      <path d="M18 30 H142" className="di-border-stroke" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M18 44 H142" className="di-border-stroke" strokeWidth="1" strokeDasharray="2 5" />
      <path d={`${curve} L142 58 L18 58 Z`} fill="url(#op-ill-trade-fill)" />
      <path d={curve} className="di-accent-stroke" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="142" cy="26" r="3" className="di-marker" strokeWidth="1.5" />
      <rect x="18" y="22" width="24" height="7" rx="2" className="di-muted" />
    </Svg>
  );
}

/** Earn - stacked bars growing in width + an accent up-arrow with "%". */
export function EarnIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-earn-bar" x1="18" y1="0" x2="94" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.95)}
          {accentStop("100%", 0.55)}
        </linearGradient>
      </defs>
      <Frame />
      <rect x="18" y="49" width="48" height="7" rx="3.5" className="di-muted" />
      <rect x="18" y="39" width="62" height="7" rx="3.5" className="di-muted" />
      <rect x="18" y="29" width="76" height="7" rx="3.5" fill="url(#op-ill-earn-bar)" />
      <path
        d="M118 40 L124 34 L130 40"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M124 34 V50" className="di-accent-stroke" strokeWidth="1.5" strokeLinecap="round" />
      <text x="135" y="40" fontFamily={MONO} fontSize="9" fontWeight="600" className="di-accent">
        %
      </text>
    </Svg>
  );
}

/** Flow - order lines + a prominent accent pay pill and check badge. */
export function FlowIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-flow-pill" x1="18" y1="40" x2="118" y2="56" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.95)}
          {accentStop("100%", 0.65)}
        </linearGradient>
      </defs>
      <Frame />
      <rect x="18" y="24" width="44" height="7" rx="2" className="di-muted" />
      <rect x="118" y="24" width="24" height="7" rx="2" className="di-muted" />
      <rect x="18" y="40" width="100" height="16" rx="8" fill="url(#op-ill-flow-pill)" />
      <rect x="48" y="46.5" width="40" height="3" rx="1.5" className="di-surface" fillOpacity="0.9" />
      <circle cx="134" cy="48" r="8" className="di-surface-box" strokeWidth="1.5" />
      <path
        d="M130.5 48 L133 50.5 L137.5 45.5"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Remittance - send account, dashed accent path, receive account. */
export function RemittanceIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-remit-pill" x1="16" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.95)}
          {accentStop("100%", 0.55)}
        </linearGradient>
      </defs>
      <rect x="8" y="22" width="52" height="36" rx="8" className="di-surface-box" strokeWidth="1.5" />
      <text x="16" y="37" fontFamily={MONO} fontSize="10" fontWeight="600" className="di-fg">
        $
      </text>
      <rect x="24" y="29" width="26" height="7" rx="2" className="di-muted" />
      <rect x="16" y="42" width="28" height="8" rx="4" fill="url(#op-ill-remit-pill)" />
      <rect x="100" y="22" width="52" height="36" rx="8" className="di-surface-box" strokeWidth="1.5" />
      <rect x="108" y="30" width="36" height="7" rx="2" className="di-muted" />
      <rect x="108" y="42" width="24" height="7" rx="2" className="di-muted" />
      <path d="M64 40 H86" className="di-accent-stroke" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      <path
        d="M90 36 L96 40 L90 44"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Stablecoin Card - virtual debit card: accent chip, contactless arcs, masked number, "$" badge. */
export function StablecoinCardIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-card-chip" x1="42" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.95)}
          {accentStop("100%", 0.6)}
        </linearGradient>
        <linearGradient id="op-ill-card-number" x1="96" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.9)}
          {accentStop("100%", 0.55)}
        </linearGradient>
      </defs>
      <rect x="34" y="18" width="92" height="46" rx="8" className="di-surface-box" strokeWidth="1.5" />
      <rect x="42" y="26" width="14" height="10" rx="2.5" fill="url(#op-ill-card-chip)" />
      <path
        d="M112 26 a8.5 8.5 0 0 1 0 12"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M107 29.5 a4 4 0 0 1 0 5"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="42" y="48" width="14" height="6" rx="3" className="di-muted" />
      <rect x="60" y="48" width="14" height="6" rx="3" className="di-muted" />
      <rect x="78" y="48" width="14" height="6" rx="3" className="di-muted" />
      <rect x="96" y="48" width="14" height="6" rx="3" fill="url(#op-ill-card-number)" />
      <circle cx="126" cy="52" r="9" className="di-surface-box" strokeWidth="1.5" />
      <text x="123" y="55.5" fontFamily={MONO} fontSize="10" fontWeight="600" className="di-accent">
        $
      </text>
    </Svg>
  );
}

/** Connect - a wallet list with one row picked, and a connected badge. */
export function ConnectIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient id="op-ill-connect-row" x1="16" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          {accentStop("0%", 0.18)}
          {accentStop("100%", 0.04)}
        </linearGradient>
      </defs>
      <Frame />
      <rect x="16" y="24" width="104" height="14" rx="5" className="di-muted" />
      <rect x="21" y="28" width="6" height="6" rx="2" className="di-border-stroke" />
      <rect x="32" y="30" width="30" height="3" rx="1.5" className="di-border-stroke" />
      <rect
        x="16"
        y="42"
        width="104"
        height="14"
        rx="5"
        fill="url(#op-ill-connect-row)"
        className="di-accent-stroke"
        strokeWidth="1.5"
      />
      <rect x="21" y="46" width="6" height="6" rx="2" className="di-accent" />
      <rect x="32" y="48" width="38" height="3" rx="1.5" className="di-accent" fillOpacity="0.55" />
      <circle cx="134" cy="49" r="8" className="di-surface-box" strokeWidth="1.5" />
      <path
        d="M130.5 49 L133 51.5 L137.5 46.5"
        className="di-accent-stroke"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function AccountsIllustration() {
  return (
    <Svg>
      <defs>
        <linearGradient
          id="op-ill-accounts-card"
          x1="20"
          y1="26"
          x2="20"
          y2="54"
          gradientUnits="userSpaceOnUse"
        >
          {accentStop("0%", 0.18)}
          {accentStop("100%", 0.06)}
        </linearGradient>
      </defs>
      <Frame />

      {/* Mirrors the public landing illustration - keep the two in step. Laid
          out across the 148x52 frame, since a vertical stack pushed the signer
          avatars outside it. */}
      <rect
        x="20"
        y="26"
        width="58"
        height="28"
        rx="7"
        fill="url(#op-ill-accounts-card)"
        className="di-accent-stroke"
        strokeWidth="1.5"
      />
      <circle cx="31" cy="40" r="4.5" className="di-accent" fillOpacity="0.75" />
      <rect x="40" y="35.5" width="28" height="3" rx="1.5" className="di-accent" fillOpacity="0.55" />
      <rect x="40" y="41.5" width="17" height="3" rx="1.5" className="di-accent" fillOpacity="0.3" />

      <path
        d="M78 40 H88 M88 31 V49 M88 31 H99 M88 49 H99"
        className="di-accent-stroke"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {[31, 49].map((cy) => (
        <g key={cy}>
          <circle cx="107" cy={cy} r="8" className="di-surface-box" strokeWidth="1.5" />
          <circle cx="107" cy={cy - 2.4} r="2.4" className="di-accent" fillOpacity="0.85" />
          <path
            d={`M103.2 ${cy + 3.4}a4.2 4.2 0 017.6 0`}
            className="di-accent-stroke"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
    </Svg>
  );
}

/** Slug -> operator illustration; unknown slugs fall back to Wallet. */
export const OPERATOR_DEMO_ILLUSTRATIONS: Record<string, () => ReactElement> = {
  wallet: WalletIllustration,
  accounts: AccountsIllustration,
  connections: ConnectIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  flow: FlowIllustration,
  remittance: RemittanceIllustration,
  "stablecoin-card": StablecoinCardIllustration,
  checkouts: FlowIllustration,
  "visa-direct": StablecoinCardIllustration,
};

export function getOperatorDemoIllustration(slug: string): () => ReactElement {
  return OPERATOR_DEMO_ILLUSTRATIONS[slug] ?? WalletIllustration;
}
