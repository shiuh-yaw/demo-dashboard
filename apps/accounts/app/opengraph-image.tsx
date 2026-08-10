import { renderDemoOgImage } from "@dynamic-demos/dynamic/og-image";

/**
 * Generic, unbranded OG/Twitter unfurl preview (Next file convention -
 * auto-wires both `og:image` and `twitter:image`). Identical for branded and
 * bare URLs: `noindex` keeps a branded demo out of search, but only a generic
 * image keeps a forwarded link's preview from leaking which customer it is for.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Accounts - a live product demo by Dynamic";

export default async function Image() {
  return renderDemoOgImage({ slug: "accounts", art: "accounts" });
}
