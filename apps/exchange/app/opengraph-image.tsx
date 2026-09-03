import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  renderDemoOgImage,
} from "@dynamic-demos/dynamic/og-image";

export const runtime = "edge";
export const alt = "Exchange - Dynamic Demos";
export const size = { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT };
export const contentType = "image/png";

/**
 * Generic OG/Twitter unfurl. Reads the catalog copy by slug; no prospect,
 * theme, or config data, so branded and bare URLs unfurl identically.
 */
export default function Image() {
  return renderDemoOgImage({ slug: "exchange", art: "trade" });
}
