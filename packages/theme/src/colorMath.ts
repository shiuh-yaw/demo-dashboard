/**
 * Color math helpers — promoted from apps/visa-direct/lib/visa-direct-config.ts
 * so the entire monorepo can derive hover states / accent variants without
 * duplicating HSL conversion code.
 *
 * All helpers operate on 6-digit hex strings (`#rrggbb`). Invalid input falls
 * back to the original hex (lossy but predictable — apps render rather than
 * crash).
 */

interface RgbTriplet {
  r: number;
  g: number;
  b: number;
}

interface HslTriplet {
  h: number;
  s: number;
  l: number;
}

const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

function parseHex(hex: string): RgbTriplet | null {
  const result = HEX_RE.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

function rgbToHex({ r, g, b }: RgbTriplet): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl({ r, g, b }: RgbTriplet): HslTriplet {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
    }
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HslTriplet): RgbTriplet {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let nr = 0;
  let ng = 0;
  let nb = 0;
  if (h < 1 / 6) {
    nr = c;
    ng = x;
  } else if (h < 2 / 6) {
    nr = x;
    ng = c;
  } else if (h < 3 / 6) {
    ng = c;
    nb = x;
  } else if (h < 4 / 6) {
    ng = x;
    nb = c;
  } else if (h < 5 / 6) {
    nr = x;
    nb = c;
  } else {
    nr = c;
    nb = x;
  }
  return {
    r: (nr + m) * 255,
    g: (ng + m) * 255,
    b: (nb + m) * 255,
  };
}

/**
 * Darken a hex color by reducing HSL lightness.
 * @param hex - Hex color (e.g. "#FF5A5F").
 * @param amount - 0–100, how many lightness percentage points to drop
 *                 (e.g. 8 = ~8% darker). Negative values are clamped to 0.
 * @returns Hex color, or the original `hex` if parsing fails.
 */
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  const newL = Math.max(0, hsl.l - amount / 100);
  return rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: newL }));
}

/**
 * Lighten a hex color by raising HSL lightness.
 * @param hex - Hex color.
 * @param amount - 0–100, how many lightness percentage points to add.
 *                 Negative values are clamped to 0.
 * @returns Hex color, or the original `hex` if parsing fails.
 */
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  const newL = Math.min(1, hsl.l + amount / 100);
  return rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: newL }));
}

/**
 * Pick a readable text color for content rendered ON `hex`.
 *
 * Uses WCAG relative luminance with the crossover threshold (~0.179)
 * where white and near-black text have equal contrast against the
 * background — above it, dark text wins; below it, white wins. The dark
 * value is the canonical `--brand-fg` (#0e121b) rather than pure black
 * so derived text stays in the D-030 palette.
 *
 * @param hex - Background hex color.
 * @returns `"#0e121b"` on light backgrounds, `"#ffffff"` on dark ones
 *          (also the fallback when parsing fails — safest on brand
 *          colors, which skew saturated/dark).
 */
export function readableTextOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#ffffff";
  const lin = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  return luminance > 0.179 ? "#0e121b" : "#ffffff";
}

/**
 * Mix two hex colors in RGB space.
 * @param a - First hex color.
 * @param b - Second hex color.
 * @param ratio - 0–1; the weight of `b` in the mix. `0` returns `a`,
 *                `1` returns `b`, `0.5` is an even split. Out-of-range
 *                values are clamped to [0, 1].
 * @returns Hex color, or `a` if either input fails to parse.
 */
export function mixHex(a: string, b: string, ratio: number): string {
  const aRgb = parseHex(a);
  const bRgb = parseHex(b);
  if (!aRgb || !bRgb) return a;
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: aRgb.r * (1 - t) + bRgb.r * t,
    g: aRgb.g * (1 - t) + bRgb.g * t,
    b: aRgb.b * (1 - t) + bRgb.b * t,
  });
}
