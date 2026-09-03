/**
 * Demo illustrations - the single source for the small geometric product
 * metaphors used on the public landing cards, the operator dashboard, and
 * the OG/Twitter unfurl image. One set of drawings, three palettes.
 *
 * Colors arrive as a `tones` object rather than CSS classes so the same
 * markup serves a browser and satori (next/og), which has no stylesheet.
 * Tones are applied via inline `style`, never presentation attributes:
 * `fill="var(--x)"` does not resolve in browsers, `style={{fill:"var(--x)"}}`
 * does - and satori honors `style` on SVG children identically to attributes.
 *
 * satori constraints these drawings must respect (all verified against
 * next/og's bundled renderer - violating any of them breaks the unfurl):
 *   - no `<text>`: throws outright. Glyphs are drawn as paths/shapes.
 *   - no component elements inside `<svg>`: silently render nothing. Shared
 *     pieces are plain functions CALLED inline (`{frameRect(t)}`), which
 *     return an element directly and so create no component boundary.
 *   - no fragments inside `<svg>`: throw. Use arrays.
 *   - `linearGradient`, `stopOpacity`, `fillOpacity` and `strokeDasharray`
 *     are all supported.
 */

import type { CSSProperties, ReactElement } from "react";

/** Palette slots every illustration draws from. */
export interface IllustrationTones {
  /** Brand accent - the one saturated color in each drawing. */
  accent: string;
  /** Card/panel fill. */
  surface: string;
  /** Panel and hairline stroke. */
  border: string;
  /** Skeleton/placeholder bar fill. */
  mutedFill: string;
  /** Foreground used for drawn glyphs. */
  fg: string;
}

/** Public landing: white/slate palette, literal values (no brand tokens there). */
export const LIGHT_ILLUSTRATION_TONES: IllustrationTones = {
  accent: "#4779FF",
  surface: "#ffffff",
  border: "#e2e8f0",
  mutedFill: "#f1f5f9",
  fg: "#0f172a",
};

/**
 * Operator dashboard: CSS vars defined under `[data-surface="operator"]`
 * (and its dark variant) in the dashboard's globals.css, so the band
 * recolors with the operator surface and never touches the public surface.
 */
export const OPERATOR_ILLUSTRATION_TONES: IllustrationTones = {
  accent: "var(--di-accent)",
  surface: "var(--di-surface)",
  border: "var(--di-border)",
  mutedFill: "var(--di-muted)",
  fg: "var(--di-fg)",
};

/**
 * OG unfurl: drawn ON the brand-gradient card, so the palette inverts - the
 * "accent" is white and the surfaces are translucent white that let the blue
 * read through. Literal values (satori resolves no vars), and rgba rather
 * than opacity so overlapping shapes keep their edges.
 */
export const OG_ILLUSTRATION_TONES: IllustrationTones = {
  accent: "#FFFFFF",
  surface: "rgba(255,255,255,0.14)",
  border: "rgba(255,255,255,0.45)",
  mutedFill: "rgba(255,255,255,0.28)",
  fg: "#FFFFFF",
};

export interface IllustrationProps {
  tones?: IllustrationTones;
  /**
   * Namespace for gradient ids. Required when two palettes render on one
   * page - SVG ids are global, so a bare `wallet-card` would let whichever
   * mounted first win for both.
   */
  idPrefix?: string;
  /** Rendered size. Drawings are authored in a 160x80 viewBox. */
  width?: number;
  height?: number;
  className?: string;
}

interface Ctx {
  t: IllustrationTones;
  p: string;
}

function ctx({
  tones = LIGHT_ILLUSTRATION_TONES,
  idPrefix = "ill",
}: IllustrationProps): Ctx {
  return { t: tones, p: idPrefix };
}

// -- shared pieces: plain functions, called inline (never <Component />) ------

const strokeBase = {
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** Outer card frame shared by most drawings. */
function frameRect({ t }: Ctx): ReactElement {
  return (
    <rect
      x="6"
      y="14"
      width="148"
      height="52"
      rx="10"
      style={{ fill: t.surface, stroke: t.border }}
      strokeWidth="1.5"
    />
  );
}

/** Two-stop accent gradient. */
function accentGradient(
  { t, p }: Ctx,
  id: string,
  coords: { x1: number; y1: number; x2: number; y2: number },
  from: number,
  to: number,
): ReactElement {
  return (
    <defs>
      <linearGradient id={`${p}-${id}`} {...coords} gradientUnits="userSpaceOnUse">
        <stop offset="0%" style={{ stopColor: t.accent }} stopOpacity={from} />
        <stop offset="100%" style={{ stopColor: t.accent }} stopOpacity={to} />
      </linearGradient>
    </defs>
  );
}

function svgProps(props: IllustrationProps) {
  return {
    width: props.width ?? 160,
    height: props.height ?? 80,
    viewBox: "0 0 160 80",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    className: props.className,
  };
}

// -- drawings ----------------------------------------------------------------

/** Wallet - a wallet body with an accent card sliding in and a snap clasp. */
export function WalletIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const glyph: CSSProperties = { stroke: t.fg, fill: "none" };
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "wallet-card", { x1: 52, y1: 0, x2: 108, y2: 0 }, 0.95, 0.6)}
      {/* Card sliding into the wallet (peeks above the body) */}
      <rect x="52" y="8" width="56" height="30" rx="5" fill={`url(#${p}-wallet-card)`} />
      <rect x="59" y="14" width="18" height="4" rx="2" style={{ fill: t.surface }} fillOpacity="0.85" />
      {/* Wallet body - drawn over the card so the card sits inside */}
      <rect x="30" y="22" width="100" height="42" rx="10" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      {/* Masked address: "0x" drawn as shapes (satori rejects <text>) */}
      <ellipse cx="45.5" cy="43" rx="3" ry="4" style={glyph} strokeWidth="1.5" />
      <path d="M50.5 39.5 L54.5 46.5" style={glyph} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M54.5 39.5 L50.5 46.5" style={glyph} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="58" y="39" width="30" height="8" rx="2" style={{ fill: t.mutedFill }} />
      {/* Snap clasp overlapping the right edge, accent dot */}
      <rect x="112" y="34" width="26" height="18" rx="9" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      <circle cx="125" cy="43" r="3" style={{ fill: t.accent }} />
    </svg>
  );
}

/** Trade - rising sparkline with a soft gradient fill under the curve. */
export function TradeIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const curve = "M18 52 C38 48 48 50 64 44 C80 38 92 44 106 36 C118 29 130 30 142 26";
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "trade-fill", { x1: 0, y1: 26, x2: 0, y2: 58 }, 0.25, 0)}
      {frameRect(c)}
      {/* Quiet gridlines */}
      <path d="M18 30 H142" style={{ stroke: t.border }} strokeWidth="1" strokeDasharray="2 5" />
      <path d="M18 44 H142" style={{ stroke: t.border }} strokeWidth="1" strokeDasharray="2 5" />
      {/* Area fill under the curve */}
      <path d={`${curve} L142 58 L18 58 Z`} fill={`url(#${p}-trade-fill)`} />
      {/* Price line */}
      <path d={curve} style={{ stroke: t.accent, fill: "none" }} strokeWidth="1.5" strokeLinecap="round" />
      {/* Last-price marker */}
      <circle cx="142" cy="26" r="3" style={{ fill: t.surface, stroke: t.accent }} strokeWidth="1.5" />
      {/* Skeleton price chip */}
      <rect x="18" y="22" width="24" height="7" rx="2" style={{ fill: t.mutedFill }} />
    </svg>
  );
}

/** Earn - stacked bars growing in width + an accent up-arrow with "%". */
export function EarnIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const accentStroke: CSSProperties = { stroke: t.accent, fill: "none" };
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "earn-bar", { x1: 18, y1: 0, x2: 94, y2: 0 }, 0.95, 0.55)}
      {frameRect(c)}
      {/* Stacked position bars - growing upward */}
      <rect x="18" y="49" width="48" height="7" rx="3.5" style={{ fill: t.mutedFill }} />
      <rect x="18" y="39" width="62" height="7" rx="3.5" style={{ fill: t.mutedFill }} />
      <rect x="18" y="29" width="76" height="7" rx="3.5" fill={`url(#${p}-earn-bar)`} />
      {/* Yield up-arrow */}
      <path d="M118 40 L124 34 L130 40" style={accentStroke} {...strokeBase} />
      <path d="M124 34 V50" style={accentStroke} strokeWidth="1.5" strokeLinecap="round" />
      {/* "%" drawn as shapes (satori rejects <text>) */}
      <circle cx="136.5" cy="35" r="1.6" style={accentStroke} strokeWidth="1.2" />
      <circle cx="140.5" cy="38.6" r="1.6" style={accentStroke} strokeWidth="1.2" />
      <path d="M141.6 33.9 L135.4 39.7" style={accentStroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Flow - order lines + a prominent accent pay pill and check badge. */
export function FlowIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "flow-pill", { x1: 18, y1: 40, x2: 118, y2: 56 }, 0.95, 0.65)}
      {frameRect(c)}
      {/* Order summary skeleton */}
      <rect x="18" y="24" width="44" height="7" rx="2" style={{ fill: t.mutedFill }} />
      <rect x="118" y="24" width="24" height="7" rx="2" style={{ fill: t.mutedFill }} />
      {/* Pay button */}
      <rect x="18" y="40" width="100" height="16" rx="8" fill={`url(#${p}-flow-pill)`} />
      <rect x="48" y="46.5" width="40" height="3" rx="1.5" style={{ fill: t.surface }} fillOpacity="0.9" />
      {/* Confirmed badge */}
      <circle cx="134" cy="48" r="8" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      <path d="M130.5 48 L133 50.5 L137.5 45.5" style={{ stroke: t.accent, fill: "none" }} {...strokeBase} />
    </svg>
  );
}

/** Remittance - send account, dashed accent path, receive account. */
export function RemittanceIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const accentStroke: CSSProperties = { stroke: t.accent, fill: "none" };
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "remit-pill", { x1: 16, y1: 0, x2: 44, y2: 0 }, 0.95, 0.55)}
      {/* Sender account */}
      <rect x="8" y="22" width="52" height="36" rx="8" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      {/* "$" drawn as shapes (satori rejects <text>) */}
      <path d="M19.2 28.6 V38.4" style={{ stroke: t.fg, fill: "none" }} strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M21.4 31.1 C21.4 29.6 17.1 29.6 17.1 31.5 C17.1 33.4 21.4 33.5 21.4 35.4 C21.4 37.3 17.1 37.3 17.1 35.8"
        style={{ stroke: t.fg, fill: "none" }}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <rect x="25" y="29" width="26" height="7" rx="2" style={{ fill: t.mutedFill }} />
      <rect x="16" y="42" width="28" height="8" rx="4" fill={`url(#${p}-remit-pill)`} />
      {/* Receiver account */}
      <rect x="100" y="22" width="52" height="36" rx="8" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      <rect x="108" y="30" width="36" height="7" rx="2" style={{ fill: t.mutedFill }} />
      <rect x="108" y="42" width="24" height="7" rx="2" style={{ fill: t.mutedFill }} />
      {/* Transfer path */}
      <path d="M64 40 H86" style={accentStroke} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      <path d="M90 36 L96 40 L90 44" style={accentStroke} {...strokeBase} />
    </svg>
  );
}

/** Stablecoin Card - virtual debit card: chip, contactless arcs, masked number, "$" badge. */
export function StablecoinCardIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const accentStroke: CSSProperties = { stroke: t.accent, fill: "none" };
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "card-chip", { x1: 42, y1: 0, x2: 56, y2: 0 }, 0.95, 0.6)}
      {accentGradient(c, "card-number", { x1: 96, y1: 0, x2: 110, y2: 0 }, 0.9, 0.55)}
      {/* Card body */}
      <rect x="34" y="18" width="92" height="46" rx="8" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      {/* Chip */}
      <rect x="42" y="26" width="14" height="10" rx="2.5" fill={`url(#${p}-card-chip)`} />
      {/* Contactless arcs */}
      <path d="M112 26 a8.5 8.5 0 0 1 0 12" style={accentStroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M107 29.5 a4 4 0 0 1 0 5" style={accentStroke} strokeWidth="1.5" strokeLinecap="round" />
      {/* Masked card number - last group highlighted */}
      <rect x="42" y="48" width="14" height="6" rx="3" style={{ fill: t.mutedFill }} />
      <rect x="60" y="48" width="14" height="6" rx="3" style={{ fill: t.mutedFill }} />
      <rect x="78" y="48" width="14" height="6" rx="3" style={{ fill: t.mutedFill }} />
      <rect x="96" y="48" width="14" height="6" rx="3" fill={`url(#${p}-card-number)`} />
      {/* Stablecoin funding badge overlapping the card edge */}
      <circle cx="126" cy="52" r="9" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      <path d="M126 46.6 V57.4" style={accentStroke} strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M128.7 49 C128.7 47.4 123.3 47.4 123.3 49.5 C123.3 51.6 128.7 51.7 128.7 53.8 C128.7 55.9 123.3 55.9 123.3 54.3"
        style={accentStroke}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Connect - a wallet list with one row picked, and a connected badge. */
export function ConnectIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "connect-row", { x1: 16, y1: 0, x2: 120, y2: 0 }, 0.18, 0.04)}
      {frameRect(c)}
      {/* Two wallet rows at the same weight as the other cards' skeletons */}
      <rect x="16" y="24" width="104" height="14" rx="5" style={{ fill: t.mutedFill }} />
      <rect x="21" y="28" width="6" height="6" rx="2" style={{ fill: t.border }} />
      <rect x="32" y="30" width="30" height="3" rx="1.5" style={{ fill: t.border }} />
      {/* The picked wallet */}
      <rect
        x="16"
        y="42"
        width="104"
        height="14"
        rx="5"
        fill={`url(#${p}-connect-row)`}
        style={{ stroke: t.accent }}
        strokeWidth="1.5"
      />
      <rect x="21" y="46" width="6" height="6" rx="2" style={{ fill: t.accent }} />
      <rect x="32" y="48" width="38" height="3" rx="1.5" style={{ fill: t.accent }} fillOpacity="0.55" />
      {/* Connected badge, same treatment as Flow's confirmed badge */}
      <circle cx="134" cy="49" r="8" style={{ fill: t.surface, stroke: t.border }} strokeWidth="1.5" />
      <path d="M130.5 49 L133 51.5 L137.5 46.5" style={{ stroke: t.accent, fill: "none" }} {...strokeBase} />
    </svg>
  );
}

/** Accounts - one wallet on the left, the signers who share it on the right. */
export function AccountsIllustration(props: IllustrationProps = {}): ReactElement {
  const c = ctx(props);
  const { t, p } = c;
  const accentStroke: CSSProperties = { stroke: t.accent, fill: "none" };
  return (
    <svg {...svgProps(props)}>
      {accentGradient(c, "accounts-card", { x1: 20, y1: 26, x2: 20, y2: 54 }, 0.18, 0.06)}
      {frameRect(c)}
      {/* Laid out ACROSS the 148x52 frame, not down it: a vertical stack put
          the signer avatars below y=66, outside the card. Strokes are accent
          rather than border - at this size the border grey read as invisible. */}
      <rect
        x="20"
        y="26"
        width="58"
        height="28"
        rx="7"
        fill={`url(#${p}-accounts-card)`}
        style={{ stroke: t.accent }}
        strokeWidth="1.5"
      />
      <circle cx="31" cy="40" r="4.5" style={{ fill: t.accent }} fillOpacity="0.75" />
      <rect x="40" y="35.5" width="28" height="3" rx="1.5" style={{ fill: t.accent }} fillOpacity="0.55" />
      <rect x="40" y="41.5" width="17" height="3" rx="1.5" style={{ fill: t.accent }} fillOpacity="0.3" />
      {/* One wallet, two signers: the bracket is the whole point of the demo. */}
      <path
        d="M78 40 H88 M88 31 V49 M88 31 H99 M88 49 H99"
        style={accentStroke}
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Flattened rather than grouped per signer: satori drops component
          elements inside <svg>, and a bare <g> buys nothing here. */}
      {[31, 49].map((cy) => (
        <circle key={`ring-${cy}`} cx="107" cy={cy} r="8" style={{ fill: t.surface, stroke: t.accent }} strokeWidth="1.5" />
      ))}
      {[31, 49].map((cy) => (
        <circle key={`head-${cy}`} cx="107" cy={cy - 2.4} r="2.4" style={{ fill: t.accent }} fillOpacity="0.85" />
      ))}
      {[31, 49].map((cy) => (
        <path
          key={`body-${cy}`}
          d={`M103.2 ${cy + 3.4}a4.2 4.2 0 017.6 0`}
          style={accentStroke}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export type DemoIllustration = (props?: IllustrationProps) => ReactElement;

/** Slug -> illustration. Resolve through `getDemoIllustration` so unknown slugs fall back. */
export const DEMO_ILLUSTRATIONS: Record<string, DemoIllustration> = {
  wallet: WalletIllustration,
  connections: ConnectIllustration,
  accounts: AccountsIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  flow: FlowIllustration,
  remittance: RemittanceIllustration,
  "stablecoin-card": StablecoinCardIllustration,
  checkouts: FlowIllustration,
  "visa-direct": StablecoinCardIllustration,
  rimau: TradeIllustration,
};

export function getDemoIllustration(slug: string): DemoIllustration {
  return DEMO_ILLUSTRATIONS[slug] ?? WalletIllustration;
}
