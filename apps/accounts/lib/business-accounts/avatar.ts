/**
 * Account avatars, stored on the account's `metadata`.
 *
 * `metadata` is a free-form JSON object on `BusinessAccount`, which makes it
 * the right home for presentation the API has no field for. The account stores
 * a website; its favicon is resolved at render time rather than copied, so a
 * site that changes its icon follows.
 *
 * Pure: reading is defensive because `metadata` is `object` in the SDK's types
 * and whatever a previous writer put there at runtime.
 */

/** Key this app writes into `BusinessAccount.metadata`. */
export const AVATAR_METADATA_KEYS = { website: "websiteUrl" } as const;

export interface AccountAvatar {
  /** Renderable image source, or undefined to fall back to initials. */
  src?: string;
  /** The website the avatar was derived from, when that is how it was set. */
  websiteUrl?: string;
}

/**
 * Reduce a typed or pasted website to a bare hostname, or null if it cannot be
 * one. Accepts `acme.com`, `www.acme.com`, `https://acme.com/teams?a=1`.
 */
export function normalizeWebsite(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // `new URL` needs a scheme; assume https for a bare host.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  let host: string;
  try {
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }

  // A hostname needs a dot and no spaces to be a real domain; "acme" or
  // "my site" would otherwise sail through as a URL.
  if (!host.includes(".") || /\s/.test(host)) return null;
  // Trailing dot is legal in DNS but breaks the favicon lookup.
  return host.replace(/\.$/, "");
}

/**
 * Favicon endpoint for a hostname.
 *
 * Google's resolver is used rather than guessing `/favicon.ico`: it follows
 * `<link rel="icon">`, handles redirects, and returns a usable fallback, so a
 * demo does not show a broken image for most of the web. It does mean the
 * hostname is sent to Google when the avatar renders.
 */
export function faviconUrl(hostname: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    hostname,
  )}&sz=${size}`;
}

/** The avatar to render for an account, from its `metadata`. */
export function readAccountAvatar(metadata: unknown): AccountAvatar {
  if (typeof metadata !== "object" || metadata === null) return {};
  const bag = metadata as Record<string, unknown>;

  const website = bag[AVATAR_METADATA_KEYS.website];
  if (typeof website === "string") {
    const host = normalizeWebsite(website);
    if (host) return { src: faviconUrl(host), websiteUrl: host };
  }

  return {};
}

/**
 * The `metadata` to send on create. Returns undefined when there is nothing to
 * store, so the create path stays on the plain SDK wrapper in that case.
 */
export function buildAvatarMetadata(input: {
  website?: string;
}): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};

  const host = input.website ? normalizeWebsite(input.website) : null;
  if (host) metadata[AVATAR_METADATA_KEYS.website] = host;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
