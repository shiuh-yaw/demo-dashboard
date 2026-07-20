/**
 * Prospect logo normalization (server-side, best-effort).
 *
 * Demo configs historically stored prospect logos as raw external URLs. Many of
 * those assets are square canvases with large transparent padding around a
 * small mark, so demo apps rendered them at wildly inconsistent perceived
 * sizes. At config-save time the dashboard normalizes the image instead:
 * fetch → trim uniform/transparent padding → fit within 512×160 → re-encode
 * as PNG → upload to Vercel Blob (content-addressed, so identical logos
 * dedupe across configs and re-saves) → store the hosted blob URL.
 *
 * When no `BLOB_READ_WRITE_TOKEN` is configured (or the upload fails) the
 * PNG is inlined as a `data:image/png;base64,...` URI instead (≤100KB), so
 * local dev works without a blob store. Inline data URIs from earlier saves
 * are migrated to blob URLs on their next save once a token is present.
 *
 * Normalization NEVER blocks a save: on any failure (bad scheme, private
 * host, timeout, oversized asset, decode error, result too large) the
 * original value is returned unchanged.
 *
 * SSRF posture: every hop (including each redirect target) is checked
 * BEFORE it is fetched — hostname/IP-literal guard plus a DNS lookup of
 * every resolved address. Redirects are followed manually so a public URL
 * cannot bounce the request to an internal service. Residual risk: DNS
 * rebinding between the lookup and the fetch (pinning the resolved IP
 * would need a custom undici dispatcher); input is operator-authenticated.
 */

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Max bytes we will download for a logo (2 MB). */
const MAX_FETCH_BYTES = 2 * 1024 * 1024;
/** Max base64 payload length we will inline (~100 KB, fallback path only). */
const MAX_DATA_URI_BASE64_LENGTH = 100 * 1024;
/** Fetch timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 5_000;
/** Max redirects we will follow (each hop is re-guarded). */
const MAX_REDIRECTS = 3;
/** Bounding box the trimmed logo is fitted into (never enlarged). */
const FIT_WIDTH = 512;
const FIT_HEIGHT = 160;
/** Blob store folder for normalized logos. */
const BLOB_LOGO_PREFIX = "prospect-logos/";
/** Public hostname suffix of Vercel Blob stores (already-normalized URLs). */
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function isPrivateIpv4Parts(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * True when `ip` is a loopback / private / link-local address literal.
 * Covers IPv4, IPv6 (loopback, link-local, unique-local), and
 * IPv4-mapped IPv6 in both dotted (`::ffff:127.0.0.1`) and hex-group
 * (`::ffff:7f00:1`) forms. Unparseable mapped forms are treated as
 * private (fail closed).
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a = -1, b = -1] = ip.split(".").map(Number);
    return isPrivateIpv4Parts(a, b);
  }
  if (version === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::" || v6 === "::1") return true;
    if (v6.startsWith("fe80:")) return true; // link-local
    if (/^f[cd]/.test(v6)) return true; // unique-local fc00::/7
    const mapped = v6.match(/^::ffff:(.+)$/);
    if (mapped) {
      const rest = mapped[1]!;
      if (isIP(rest) === 4) {
        const [a = -1, b = -1] = rest.split(".").map(Number);
        return isPrivateIpv4Parts(a, b);
      }
      const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const hi = parseInt(hex[1]!, 16);
        return isPrivateIpv4Parts(hi >> 8, hi & 0xff);
      }
      return true; // unrecognized mapped form — refuse
    }
  }
  return false;
}

/**
 * Literal-level guard: reject hostnames that are obviously internal by
 * name, or that are private-range IP literals. Name-only — DNS resolution
 * happens separately in `resolvesToPrivate`. Note the WHATWG URL parser
 * already canonicalizes numeric IPv4 encodings (decimal/octal/hex, e.g.
 * `http://2130706433/`) to dotted-quad, so those arrive here as literals.
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (isIP(host)) return isPrivateIp(host);
  return false;
}

/**
 * Resolve `hostname` and check every returned address. Fails closed: a
 * lookup error, or ANY resolved address in a private range, blocks the
 * fetch. IP literals are checked directly without a lookup.
 */
async function resolvesToPrivate(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPrivateIp(host);
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (addresses.length === 0) return true;
    return addresses.some((entry) => isPrivateIp(entry.address));
  } catch {
    return true; // unresolvable — the fetch would fail anyway
  }
}

/** Guard one hop; returns the response, or null when the hop is refused. */
async function guardedFetch(url: URL): Promise<Response | null> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isPrivateHost(url.hostname)) return null;
  if (await resolvesToPrivate(url.hostname)) return null;
  return fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "manual",
  });
}

/**
 * Upload a normalized PNG to Vercel Blob. Content-addressed pathname
 * (sha256 of the bytes) so identical logos map to one blob and re-saves
 * are idempotent. Returns null when no token is configured or the upload
 * fails — callers fall back to inlining.
 */
async function uploadToBlob(png: Buffer): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put } = await import("@vercel/blob");
    const hash = createHash("sha256").update(png).digest("hex").slice(0, 32);
    const { url } = await put(`${BLOB_LOGO_PREFIX}${hash}.png`, png, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000, // content-addressed — cache forever
    });
    return url;
  } catch {
    return null;
  }
}

/**
 * Trim + fit + re-encode the image, then store it: Vercel Blob when a
 * token is configured, inline data URI otherwise. Returns `fallback` on
 * any processing failure or an oversized inline result.
 */
async function processAndStore(
  input: Buffer,
  fallback: string,
): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(input)
      .trim()
      .resize(FIT_WIDTH, FIT_HEIGHT, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    const blobUrl = await uploadToBlob(png);
    if (blobUrl) return blobUrl;

    const base64 = png.toString("base64");
    if (base64.length > MAX_DATA_URI_BASE64_LENGTH) return fallback;
    return `data:image/png;base64,${base64}`;
  } catch {
    return fallback;
  }
}

/**
 * Normalize a single logo value. Returns a hosted Vercel Blob URL (or an
 * inline `data:image/png;base64,...` URI when no blob token is configured)
 * on success, or the original value unchanged on any failure. Already-
 * normalized blob URLs pass through untouched; inline data URIs from
 * earlier saves are re-uploaded to blob once a token exists.
 */
export async function normalizeLogoUrl(value: string): Promise<string> {
  // Inline data URI (fallback-path output of an earlier save): migrate it
  // to blob storage when possible, otherwise leave it as-is.
  if (value.startsWith("data:")) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return value;
    const match = value.match(/^data:image\/[\w.+-]+;base64,(.+)$/);
    if (!match) return value;
    const decoded = Buffer.from(match[1]!, "base64");
    if (decoded.byteLength === 0 || decoded.byteLength > MAX_FETCH_BYTES) {
      return value;
    }
    return processAndStore(decoded, value);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  // Our own blob store — already normalized, nothing to do.
  if (url.hostname.endsWith(BLOB_HOST_SUFFIX)) return value;

  try {
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await guardedFetch(url);
      if (!res) return value;
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) return value;
        url = new URL(location, url);
        continue;
      }
      break;
    }
    if (!res || !res.ok) return value;

    const declared = res.headers.get("content-length");
    if (declared && Number(declared) > MAX_FETCH_BYTES) return value;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_FETCH_BYTES) return value;

    return await processAndStore(buf, value);
  } catch {
    // Timeout, network error, etc. — keep the original URL; normalization
    // is best-effort.
    return value;
  }
}

const LOGO_KEYS = ["logo", "logoUrl"] as const;

/**
 * Normalize any logo values inside `config.branding` (`logo` and `logoUrl`
 * keys): http(s) URLs and inline `data:image/...` URIs. Non-image values
 * (e.g. the `"dynamic" | "custom"` logo enums) are left untouched. Returns
 * the config unchanged (same reference) when nothing was normalized.
 */
export async function normalizeBrandingLogos<T>(config: T): Promise<T> {
  if (!config || typeof config !== "object") return config;
  const branding = (config as { branding?: unknown }).branding;
  if (!branding || typeof branding !== "object") return config;

  const next: Record<string, unknown> = {
    ...(branding as Record<string, unknown>),
  };
  let changed = false;
  for (const key of LOGO_KEYS) {
    const current = next[key];
    if (
      typeof current !== "string" ||
      (!/^https?:\/\//i.test(current) && !current.startsWith("data:image/"))
    ) {
      continue;
    }
    const normalized = await normalizeLogoUrl(current);
    if (normalized !== current) {
      next[key] = normalized;
      changed = true;
    }
  }
  if (!changed) return config;
  return { ...(config as object), branding: next } as T;
}
