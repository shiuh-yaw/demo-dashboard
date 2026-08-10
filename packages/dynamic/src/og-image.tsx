/**
 * Generic OG/Twitter unfurl image for demo apps (GTM share-link privacy,
 * companion to `./noindex`). `renderDemoOgImage` takes ONLY a demo label -
 * no prospect, brand, or theme data, and no config fetch. Every request
 * renders the identical generic Dynamic-branded image, branded share link
 * or bare URL alike, on purpose: `noindex` blocks search crawlers, but a
 * link *preview* (Slack/iMessage/Twitter unfurl) is generated the moment
 * someone forwards a link, before any crawler noindex rule ever applies -
 * so the unfurl itself must never leak which customer a branded link is
 * for. Each app wires this up via the `app/opengraph-image.tsx` file
 * convention (Next auto-derives both `og:image` and `twitter:image` from
 * it - no manual metadata needed).
 */

import {
  AccountsIllustration,
  ConnectIllustration,
  EarnIllustration,
  FlowIllustration,
  RemittanceIllustration,
  StablecoinCardIllustration,
  TradeIllustration,
  WalletIllustration,
  LIGHT_ILLUSTRATION_TONES,
  type DemoIllustration,
} from "@dynamic-demos/ui/demo-illustrations";
import {
  OG_BAND_FROM,
  OG_BAND_TO,
  getDemoCatalogEntry,
  type DemoCategory,
} from "@dynamic-demos/ui/demo-catalog";
import { DemoHeroBand } from "@dynamic-demos/ui/demo-hero-band";
import {
  DYNAMIC_LOGO_ICON_PATHS,
  DYNAMIC_LOGO_TAGLINE_PATHS,
  DYNAMIC_LOGO_VIEWBOX,
  DYNAMIC_LOGO_WORDMARK_PATHS,
} from "@dynamic-demos/ui/dynamic-logo-paths";
import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const DEFAULT_SUBTITLE = "Live product demo";
const FOOTER_LABEL = "demo.dynamic.xyz";
// DM Sans is the brand face (the dashboard loads it as --font-dm-sans);
// Inter was a mismatch. Google serves DM Sans as woff to the old-browser UA
// below, which satori parses fine - see `loadGoogleFontWeight`.
const FONT_FAMILY = "DM Sans";
// Brand gradient card. #4779FF is packages/theme's DEFAULT_BASE_THEME
// primaryColor; the deeper indigo and violet flank it to give the card
// actual color rather than the near-black it used to be.
// The card IS the hero band: the landing's category-tinted gradient and dot
// texture run full-bleed across all 1200x630 rather than sitting in a tile.
// That means light values throughout - the illustrations keep their normal
// landing palette, so every tonal detail survives.
// Finer + fainter than the landing's 14px/6% grid: at 1200x630 a coarse grid
// reads as visible polka dots rather than paper texture.
const BAND_DOT = "rgba(15,23,42,0.065)";
const BAND_DOT_SPACING = 17;
const FG_TITLE = "#0F172A";
const FG_PITCH = "#475569";
const FG_FOOTER = "#94A3B8";
// Logo on a light band uses the real lockup colors, not a white knockout.
const LOGO_ICON = "#4779FF";
const LOGO_WORDMARK = "#252731";
/** Fallback tint for demos with no catalog entry. */
const DEFAULT_CATEGORY: DemoCategory = "wallet";

/**
 * Which product motif to draw bottom-right. Deliberately a motif vocabulary
 * rather than a per-app enum: several demos share one (`checkout` covers
 * flow/checkouts/shop, `transfer` covers remittance/proceeds/cross-border),
 * and nothing here is prospect-specific. Omit it and the card renders
 * text-only.
 */
export type OgArtKey =
  | "wallet"
  | "connect"
  | "accounts"
  | "trade"
  | "earn"
  | "checkout"
  | "transfer"
  | "card";

export interface RenderDemoOgImageOptions {
  /**
   * Catalog slug - PREFERRED. The name and the short pitch are then read from
   * `DEMO_CATALOG`, so the unfurl shows the exact words as the landing card
   * and the nav grid. Still generic, still prospect-free: catalog copy is
   * product copy.
   */
  slug?: string;
  /**
   * Human demo name shown large. Only needed for demos with no catalog entry
   * (deposit, proceeds, shop, cross-border AP/AR). Ignored when `slug`
   * resolves. No prospect/brand copy belongs here.
   */
  demoLabel?: string;
  /** Overrides the catalog tagline. Generic copy only - never prospect copy. */
  subtitle?: string;
  /** Product motif drawn in the art tile. Omitted → text-only card. */
  art?: OgArtKey;
}

/**
 * Text handed to Google Fonts' `text=` subsetting param so the font file
 * only carries the glyphs this image actually renders. Pure + unit-tested.
 */
export function buildOgFontSubsetText(demoLabel: string, subtitle: string): string {
  const chars = new Set(`Dynamic ${demoLabel} ${subtitle} ${FOOTER_LABEL}`);
  return Array.from(chars).join("");
}

async function fetchFontFile(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font file fetch failed: ${res.status}`);
  return res.arrayBuffer();
}

async function loadGoogleFontWeight(
  weight: 400 | 700,
  text: string,
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${FONT_FAMILY}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl, {
    headers: {
      // An old-browser UA makes Google Fonts serve ttf/otf instead of
      // woff2 - satori (next/og's renderer) can only parse ttf/otf/woff.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
    },
  });
  if (!cssRes.ok) throw new Error(`google fonts css fetch failed: ${cssRes.status}`);
  const css = await cssRes.text();
  // satori parses ttf/otf/woff (NOT woff2). Google returns woff for DM Sans
  // under this UA and ttf for some other families, so accept all three -
  // matching only truetype/opentype silently dropped the brand font and fell
  // back to next/og's default face.
  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/);
  const fontUrl = match?.[1];
  if (!fontUrl) throw new Error("no ttf/otf/woff url in google fonts css response");
  return fetchFontFile(fontUrl);
}

/**
 * Best-effort brand font load. Any failure (offline, Google Fonts down, an
 * unexpected CSS response shape) resolves to `null` instead of throwing -
 * `renderDemoOgImage` then omits the `fonts` option entirely and next/og
 * falls back to its own bundled default font, so an OG image request never
 * 500s because of a font fetch.
 */
async function loadBrandFonts(
  text: string,
): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer } | null> {
  try {
    const [regular, bold] = await Promise.all([
      loadGoogleFontWeight(400, text),
      loadGoogleFontWeight(700, text),
    ]);
    return { regular, bold };
  } catch {
    return null;
  }
}

/**
 * The full Dynamic lockup - diamond + "dynamic" + "a Fireblocks company" -
 * in its real colors: blue diamond, near-black wordmark, for the light band.
 *
 * Shares its outlines with the React `<DynamicLogo />` via
 * `@dynamic-demos/ui/dynamic-logo-paths`, so the two can never diverge. The
 * component wraps these in `<mask>`/`<clipPath>`, which satori does not
 * support; those masks are plain bounding-box rects that clip nothing, so
 * this renderer draws the same paths flat. Every glyph here is an outline,
 * never `<text>` - satori rejects `<text>` outright, and the tagline is far
 * too small to survive as live type at unfurl scale anyway.
 */
function BrandLockup() {
  return (
    <svg
      width={268}
      height={60}
      viewBox={DYNAMIC_LOGO_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {DYNAMIC_LOGO_ICON_PATHS.map((d) => (
        <path key={d} d={d} fill={LOGO_ICON} />
      ))}
      {[...DYNAMIC_LOGO_WORDMARK_PATHS, ...DYNAMIC_LOGO_TAGLINE_PATHS].map((d) => (
        <path key={d} d={d} fill={LOGO_WORDMARK} />
      ))}
    </svg>
  );
}

/**
 * Motif key -> the shared illustration used for it. The drawings live in
 * `@dynamic-demos/ui/demo-illustrations` alongside the landing and operator
 * consumers; only the palette differs here. That module documents the
 * satori constraints it is written to satisfy.
 */
const DEMO_ART: Record<OgArtKey, DemoIllustration> = {
  wallet: WalletIllustration,
  connect: ConnectIllustration,
  accounts: AccountsIllustration,
  trade: TradeIllustration,
  earn: EarnIllustration,
  checkout: FlowIllustration,
  transfer: RemittanceIllustration,
  card: StablecoinCardIllustration,
};

/**
 * Renders the generic, unbranded 1200x630 OG/Twitter preview for a demo
 * app. Takes no prospect/theme/brand data and performs no config fetch -
 * see the module doc comment for why. Never throws: font loading is
 * wrapped so a network hiccup degrades to the default font rather than
 * failing the whole image request.
 */
export async function renderDemoOgImage({
  slug,
  demoLabel,
  subtitle,
  art,
}: RenderDemoOgImageOptions): Promise<ImageResponse> {
  const catalog = slug ? getDemoCatalogEntry(slug) : undefined;
  const label = catalog?.name ?? demoLabel;
  if (!label) {
    throw new Error(
      "renderDemoOgImage needs a `slug` that resolves in DEMO_CATALOG, or an explicit `demoLabel`",
    );
  }
  // Catalog tagline first: the whole point of the shared catalog is that the
  // card, the nav and the unfurl never say three different things.
  const pitch = subtitle ?? catalog?.tagline ?? DEFAULT_SUBTITLE;
  const Art = art ? DEMO_ART[art] : null;
  const subsetText = buildOgFontSubsetText(label, pitch);
  const loaded = await loadBrandFonts(subsetText);
  const fonts = loaded
    ? [
        { name: FONT_FAMILY, data: loaded.regular, weight: 400 as const, style: "normal" as const },
        { name: FONT_FAMILY, data: loaded.bold, weight: 700 as const, style: "normal" as const },
      ]
    : undefined;
  // Only set an explicit `fontFamily` when a custom font actually loaded -
  // an object literal key set to `undefined` is still an OWN property
  // (unlike an omitted key), and satori's font matching reads it
  // unconditionally, so `{ fontFamily: undefined }` throws inside
  // next/og's renderer. Omitting the key entirely lets satori fall back to
  // its bundled default font.
  const category = catalog?.category ?? DEFAULT_CATEGORY;
  const rootStyle: CSSProperties = {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    padding: 72,
  };
  if (loaded) rootStyle.fontFamily = `${FONT_FAMILY}, sans-serif`;

  return new ImageResponse(
    (
      <DemoHeroBand
        from={OG_BAND_FROM[category]}
        to={OG_BAND_TO[category]}
        dotColor={BAND_DOT}
        dots="svg"
        width={OG_IMAGE_WIDTH}
        height={OG_IMAGE_HEIGHT}
        dotSpacing={BAND_DOT_SPACING}
        style={rootStyle}
      >
        {/* The band centers its children; this fills it and lays the card out
            normally. Absolute so it stacks over the dot layer. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            flexDirection: "column",
            padding: 72,
          }}
        >
          <div style={{ display: "flex" }}>
            <BrandLockup />
          </div>
          <div
            style={{
              display: "flex",
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 44,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
                maxWidth: 540,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 68,
                  fontWeight: 700,
                  color: FG_TITLE,
                  lineHeight: 1.06,
                  letterSpacing: -1.6,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 27,
                  fontWeight: 400,
                  color: FG_PITCH,
                  lineHeight: 1.38,
                }}
              >
                {pitch}
              </div>
            </div>
            {Art ? (
              <div style={{ display: "flex", flexShrink: 0 }}>
                <Art tones={LIGHT_ILLUSTRATION_TONES} idPrefix="og" width={456} height={228} />
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: FG_FOOTER }}>{FOOTER_LABEL}</div>
        </div>
      </DemoHeroBand>
    ),
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fonts,
    },
  );
}
