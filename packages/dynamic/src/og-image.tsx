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

import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const DEFAULT_SUBTITLE = "Live product demo";
const FOOTER_LABEL = "demo.dynamic.xyz";
const FONT_FAMILY = "Inter";
// Mirrors packages/theme's DEFAULT_BASE_THEME.primaryColor (brand blue) and
// the dark widget theme's pageBackground/foreground/mutedText/border - kept
// as local literals rather than a new @dynamic-demos/theme dependency since
// this is the composer's only use of them.
const BRAND_BLUE = "#4779FF";
const BG_FROM = "#0A0A0A";
const BG_TO = "#161618";
const FG_WHITE = "#FFFFFF";
const MUTED_SUBTITLE = "#9A9A9A";
const MUTED_FOOTER = "#636366";

export interface RenderDemoOgImageOptions {
  /**
   * Human demo name shown large, e.g. "Trade", "Stablecoin Card". No
   * prospect/brand copy belongs here - this is the one and only string
   * that varies per app.
   */
  demoLabel: string;
  /** Short line under `demoLabel`. Generic by default; do not pass prospect copy. */
  subtitle?: string;
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
  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/);
  const fontUrl = match?.[1];
  if (!fontUrl) throw new Error("no ttf/otf url in google fonts css response");
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

/** Dynamic's diamond mark - plain filled paths only (no mask/clipPath) so it renders reliably under satori's limited SVG support. */
function BrandMark() {
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 102 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M43.9405 14.1966C42.0577 15.899 40.2184 17.587 38.3791 19.2462C29.8198 27.0081 21.2461 34.7845 12.6868 42.5464C10.7172 44.321 8.68962 46.0379 6.21308 47.0766C3.27309 48.3174 1.5931 47.5383 0.651729 44.4509C-0.666195 40.1226 0.0434567 36.0974 2.57793 32.3751C4.75033 29.2155 7.47307 26.5753 10.2827 24.0216C14.7579 19.9387 19.262 15.899 23.824 11.9315C25.8226 10.1857 28.0095 8.59873 30.6743 8.06492C38.6688 6.49233 43.7522 13.9802 43.9549 14.1966H43.9405Z"
        fill={BRAND_BLUE}
      />
      <path
        d="M5.50342 53.7132C10.3696 52.3426 14.0048 49.3273 17.553 46.1533C28.8785 36.0541 40.175 25.9549 51.5439 15.9279C54.0494 13.7205 56.6852 11.5996 59.4804 9.7385C63.0286 7.38683 66.881 7.04057 70.69 9.29125C72.0658 10.0992 73.4127 11.037 74.5279 12.1623C78.3947 16.0721 82.2327 20.0541 85.9547 24.1082C89.923 28.4076 93.8188 32.7791 97.6133 37.2227C98.9167 38.752 99.9884 40.5266 100.857 42.33C102.494 45.6772 102.074 48.9955 100.075 52.1262C98.2939 54.9252 95.8898 57.2191 93.4278 59.3976C83.7678 67.9243 74.1224 76.4509 64.3465 84.862C61.7252 87.1271 58.8431 89.147 55.8597 90.936C50.2549 94.312 44.6356 93.8936 39.5232 89.8972C36.5543 87.5744 33.7446 84.963 31.1957 82.2074C22.9695 73.2913 14.8882 64.2597 6.74893 55.257C6.34342 54.8097 5.96687 54.3192 5.47446 53.7277L5.50342 53.7132Z"
        fill={BRAND_BLUE}
      />
    </svg>
  );
}

/**
 * Renders the generic, unbranded 1200x630 OG/Twitter preview for a demo
 * app. Takes no prospect/theme/brand data and performs no config fetch -
 * see the module doc comment for why. Never throws: font loading is
 * wrapped so a network hiccup degrades to the default font rather than
 * failing the whole image request.
 */
export async function renderDemoOgImage({
  demoLabel,
  subtitle = DEFAULT_SUBTITLE,
}: RenderDemoOgImageOptions): Promise<ImageResponse> {
  const subsetText = buildOgFontSubsetText(demoLabel, subtitle);
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
  const rootStyle: CSSProperties = {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    padding: 72,
    background: `linear-gradient(135deg, ${BG_FROM} 0%, ${BG_TO} 100%)`,
  };
  if (loaded) rootStyle.fontFamily = `${FONT_FAMILY}, sans-serif`;

  return new ImageResponse(
    (
      <div style={rootStyle}>
        {/* Decorative brand-blue glow, top-right - purely ornamental. */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: 420,
            background: BRAND_BLUE,
            opacity: 0.18,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BrandMark />
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: FG_WHITE, letterSpacing: -1 }}>
            Dynamic
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 700,
              color: FG_WHITE,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {demoLabel}
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 400, color: MUTED_SUBTITLE }}>
            {subtitle}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: MUTED_FOOTER }}>{FOOTER_LABEL}</div>
      </div>
    ),
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fonts,
    },
  );
}
