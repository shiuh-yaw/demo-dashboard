/**
 * Where a company's brand assets come from: its own markup, its web app
 * manifest, and two central icon services. Shared by the AI theme import
 * (`lib/actions/extract-theme.ts`) and the operator-facing logo picker
 * (`lib/actions/logo-options.ts`), which must offer the same candidates the
 * import chose from.
 *
 * Not a server-action module on purpose - these are plain helpers, and
 * "use server" would force every export to be an async action.
 */

/**
 * Browser-shaped request headers. A self-identifying bot UA gets a flat 403
 * from most enterprise sites (banks especially), which used to abort the whole
 * import.
 */
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Assets whose filename marks them as an inverted (light-on-dark) variant.
 * Correct logos, but they vanish on a light surface, so they rank last. */
export const INVERTED_ASSET =
  /(?:^|[-_./])(?:white|light|inverse|inverted|invert|reverse|reversed|negative|mono|knockout)(?:[-_./]|\.|$)/i;

export function resolveUrl(url: string, baseOrigin: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${baseOrigin}${url}`;
  return `${baseOrigin}/${url}`;
}

export function extractMetaContent(html: string, name: string): string | null {
  const propertyMatch = html.match(
    new RegExp(
      `<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (propertyMatch) return propertyMatch[1];

  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (nameMatch) return nameMatch[1];

  const reversedMatch = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    ),
  );
  if (reversedMatch) return reversedMatch[1];

  return null;
}

export function extractLinkHref(html: string, rel: string): string | null {
  const match = html.match(
    new RegExp(
      `<link[^>]*rel=["'][^"']*${rel}[^"']*["'][^>]*href=["']([^"']+)["']`,
      "i",
    ),
  );
  if (match) return match[1];

  const reversedMatch = html.match(
    new RegExp(
      `<link[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${rel}[^"']*["']`,
      "i",
    ),
  );
  return reversedMatch ? reversedMatch[1] : null;
}

/**
 * The document's masthead: everything up to the end of the header/nav, or the
 * first 6k characters when the markup has neither. A company's own wordmark
 * lives here; third-party logos live in "trusted by" strips further down.
 */
export function mastheadHtml(html: string): string {
  const close = html.search(/<\/header>|<\/nav>/i);
  if (close > 0) return html.slice(0, close);
  return html.slice(0, 6000);
}

/**
 * Every logo the markup itself offers, best first. Exported as a list (not
 * just the winner) so the picker can show the alternatives.
 */
export function logoCandidatesFromHtml(html: string): string[] {
  // Order matters: the site's own header logo is the WORDMARK, which is what
  // belongs in a demo's branding slot. Social-card meta (og:image /
  // twitter:image) is not a logo at all - chainalysis.com served a
  // screenshot from it - so it is excluded entirely; the icon services in
  // `logoSources` are a better fallback than a marketing card.
  const wordmarkCandidates = [
    extractMetaContent(html, "og:logo"),
    extractLinkHref(html, "logo"),
  ];

  // Scoped to the masthead. A bare "src contains logo" scan over the whole
  // page matches CUSTOMER LOGO WALLS - chainalysis.com yielded
  // `logo-coinbase-1.svg`, Coinbase's mark on a "trusted by" strip.
  const masthead = mastheadHtml(html);
  const imgCandidates: string[] = [];
  const imgPatterns = [
    /<img[^>]*src=["']([^"']+)["'][^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*>/i,
    /<img[^>]*(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i,
    /<img[^>]*src=["']([^"']*logo[^"']+)["'][^>]*>/i,
  ];

  for (const pattern of imgPatterns) {
    const match = masthead.match(pattern);
    if (match?.[1]) imgCandidates.push(match[1]);
  }

  // Square app icons - a real logo, but not the wordmark, so they rank last.
  const iconCandidates = [
    extractLinkHref(html, "apple-touch-icon"),
    extractLinkHref(html, "apple-touch-icon-precomposed"),
    extractLinkHref(html, "mask-icon"),
  ];

  // Deduped: one asset commonly matches several img patterns at once, and a
  // picker showing the same logo three times reads as three choices.
  const usable = [
    ...new Set(
      [...wordmarkCandidates, ...imgCandidates, ...iconCandidates]
        .filter(Boolean)
        .map((candidate) => String(candidate)),
    ),
  ].filter((candidate) => !/favicon/i.test(candidate));

  // A light-on-dark variant is still the right brand, so it is kept - just
  // behind anything that survives on a light surface.
  return [
    ...usable.filter((candidate) => !INVERTED_ASSET.test(candidate)),
    ...usable.filter((candidate) => INVERTED_ASSET.test(candidate)),
  ];
}

/** The single best logo in the markup, or null. */
export function extractLogoFromHtml(html: string): string | null {
  return logoCandidatesFromHtml(html)[0] ?? null;
}

/**
 * Web app manifest icons + theme colour - the one MACHINE-READABLE brand
 * source most sites publish, and what a paid brand API leans on too. Declared
 * sizes mean no guessing, and `theme_color` is the company's own hex rather
 * than one inferred from a screenshot.
 */
export async function fetchManifestBrand(
  html: string,
  baseOrigin: string,
): Promise<{ icons: string[]; themeColor: string | null }> {
  const href =
    extractLinkHref(html, "manifest") ?? `${baseOrigin}/site.webmanifest`;
  try {
    const res = await fetch(resolveUrl(href, baseOrigin), {
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return { icons: [], themeColor: null };
    const manifest = (await res.json()) as {
      icons?: { src?: string; sizes?: string }[];
      theme_color?: string;
    };
    // Largest first: a 512px maskable icon beats a 48px one for both display
    // and the colour read.
    const icons = (manifest.icons ?? [])
      .filter((i): i is { src: string; sizes?: string } => !!i.src)
      .sort((a, b) => iconArea(b.sizes) - iconArea(a.sizes))
      .map((i) => resolveUrl(i.src, baseOrigin));
    const themeColor =
      typeof manifest.theme_color === "string" ? manifest.theme_color : null;
    return { icons, themeColor };
  } catch {
    return { icons: [], themeColor: null };
  }
}

/** Largest dimension declared in a manifest `sizes` string ("512x512 256x256"). */
export function iconArea(sizes: string | undefined): number {
  if (!sizes) return 0;
  let max = 0;
  for (const token of sizes.split(/\s+/)) {
    const [w] = token.split("x");
    const n = Number.parseInt(w ?? "", 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

/**
 * Central logo services, used only when the page offers no wordmark of its
 * own. Both return square icon marks, never the horizontal wordmark, which is
 * why the site's own logo is tried first.
 *
 * Clearbit used to lead this list; its free Logo API was retired after the
 * HubSpot acquisition, so every lookup missed. Google s2 is the same service
 * `ProspectIcon` renders app-wide, so the fallback matches the row icon.
 */
export function logoSources(hostname: string): string[] {
  return [
    `https://unavatar.io/${hostname}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=256`,
  ];
}

/**
 * Every reachable logo, best first. The list (not just the winner) is kept so
 * a logo the model reports as light-on-dark can be swapped for the next one
 * that survives on a light surface - and so the picker can offer them all.
 */
export async function resolveLogoCandidates(
  hostname: string,
  scrapedLogos: string[],
  baseOrigin: string,
  manifestIcons: string[] = [],
): Promise<string[]> {
  // The site's own wordmark first - it is the branding a demo should carry -
  // then its declared manifest icons, then the icon services as a last resort.
  const candidates = [
    ...scrapedLogos.map((logo) => resolveUrl(logo, baseOrigin)),
    ...manifestIcons,
    ...logoSources(hostname),
  ].filter(Boolean);

  const reachable: string[] = [];
  for (const candidate of new Set(candidates)) {
    try {
      const response = await fetch(candidate, {
        method: "HEAD",
        headers: BROWSER_HEADERS,
      });
      if (response.ok) reachable.push(candidate);
    } catch {
      // Try the next source.
    }
  }
  return reachable;
}

/**
 * Fetch a logo URL and return it as base64 + media type, suitable for
 * embedding as an `image` content block in the Anthropic Messages API.
 *
 * Returns `null` when the URL is unreachable, non-image, an unsupported
 * format (e.g. SVG - Anthropic's vision endpoint accepts PNG/JPEG/GIF/WebP
 * only), or larger than Anthropic's per-image cap (~5 MB).
 */
export async function fetchLogoAsImage(url: string): Promise<{
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
} | null> {
  try {
    // Browser headers here too: a scraped logo lives on the site's own asset
    // host, which rejects a bot UA exactly as the page does.
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const supported = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ] as const;
    const mediaType = supported.find((t) => contentType.startsWith(t));
    if (!mediaType) return null;
    const buf = await res.arrayBuffer();
    // Anthropic caps inline images at 5 MB. Reject larger payloads rather
    // than letting the API error and pull the whole import down with it.
    if (buf.byteLength > 5_000_000) return null;
    const base64 = Buffer.from(buf).toString("base64");
    return { base64, mediaType };
  } catch {
    return null;
  }
}
