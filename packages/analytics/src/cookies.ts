/**
 * Client-side cookie helpers for the GTM tracker.
 *
 * These are plain `document.cookie` reads/writes - the tracker runs entirely
 * in the browser (mounted from a Next.js layout), so there is no
 * `next/headers` server-side cookie jar involved here. Every export is
 * fail-silent: cookie access can throw in locked-down embeds (third-party
 * cookie blocking, sandboxed iframes) and that must never surface to the
 * consuming demo.
 */

export const ANON_COOKIE = "dd_anon";
export const SHARE_COOKIE = "dd_share";
export const INTERNAL_COOKIE = "dd_internal";

const YEAR_SECONDS = 60 * 60 * 24 * 365;
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

/** Generate a random uuid v4. Exported for reuse by tracker.tsx / use-track.ts. */
export function generateUuid(): string {
  return safeRandomUuid();
}

function safeRandomUuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to manual fallback below
  }
  // Fallback for environments without crypto.randomUUID (older Safari/embeds).
  // Uses crypto.getRandomValues when available - never Math.random() for the
  // random bytes themselves.
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  } catch {
    // Last resort - should be unreachable in any browser this package targets.
    return "00000000-0000-4000-8000-000000000000";
  }
}

function readCookie(name: string): string | undefined {
  try {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    if (!match) return undefined;
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  try {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; samesite=lax`;
  } catch {
    // fail-silent: cookie writes can throw under storage restrictions
  }
}

/** Read `dd_anon`, generating and persisting a new uuid (1y) if absent. */
export function ensureAnonId(): string {
  try {
    const existing = readCookie(ANON_COOKIE);
    if (existing) return existing;
    const anonId = safeRandomUuid();
    writeCookie(ANON_COOKIE, anonId, YEAR_SECONDS);
    return anonId;
  } catch {
    return safeRandomUuid();
  }
}

/**
 * If `share` is present in `search`, persist it to `dd_share` (30d) and
 * return it. Otherwise return the existing cookie value, if any.
 */
export function syncShareCookie(
  search: URLSearchParams | Record<string, string | undefined>,
): string | undefined {
  try {
    const token =
      search instanceof URLSearchParams
        ? search.get("share")
        : search.share;
    if (token) {
      writeCookie(SHARE_COOKIE, token, THIRTY_DAYS_SECONDS);
      return token;
    }
    return readCookie(SHARE_COOKIE);
  } catch {
    return undefined;
  }
}

/**
 * If `internal=1` is present in `search`, persist `dd_internal` (1y) and
 * return true. Otherwise return the existing cookie state, if any.
 */
export function syncInternalCookie(
  search: URLSearchParams | Record<string, string | undefined>,
): boolean {
  try {
    const flag =
      search instanceof URLSearchParams
        ? search.get("internal")
        : search.internal;
    if (flag === "1") {
      writeCookie(INTERNAL_COOKIE, "1", YEAR_SECONDS);
      return true;
    }
    return readCookie(INTERNAL_COOKIE) === "1";
  } catch {
    return false;
  }
}

export function getShareToken(): string | undefined {
  return readCookie(SHARE_COOKIE);
}

export function getIsInternal(): boolean {
  return readCookie(INTERNAL_COOKIE) === "1";
}
