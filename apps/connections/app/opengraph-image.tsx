import { renderDemoOgImage } from "@dynamic-demos/dynamic/og-image";

/**
 * Generic, unbranded OG/Twitter unfurl preview (Next file convention -
 * auto-wires both `og:image` and `twitter:image`). Identical for branded
 * and bare URLs alike - see `renderDemoOgImage`'s doc comment for why.
 *
 * Labelled for the demo, not the header's Flow mark: this is the shared
 * unfurl every demo emits, and it must not imply a prospect or a product
 * the link does not point at.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Connections - a live product demo by Dynamic";

export default async function Image() {
  return renderDemoOgImage({ slug: "connections", art: "connect" });
}
