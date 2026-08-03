/**
 * CORS for the public tracker-facing endpoints (`/api/share/context`, and
 * Phase GTM-06's `/api/events`). Distinct from the wildcard `src/lib/cors.ts`
 * used by operator-facing provider endpoints - these reflect only an allowed
 * origin, never `*`: https `dynamic.dev` + `dynamic.xyz` (and their
 * subdomains) are built in, external origins come from `TRACK_CORS_ORIGINS`.
 * Non-allowed origins get no CORS
 * headers at all (leaks nothing about the allowlist to a rejected caller).
 */

import { NextResponse } from "next/server";

import { env } from "@/env";

/** Comma-separated -> trimmed, lowercased, de-blanked origin list. */
export function parseTrackCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Headers for an allowlisted origin (reflects the origin verbatim, adds
 * `Vary: Origin`), or `null` when the origin is missing or not allowlisted -
 * callers should send the response without any CORS headers in that case.
 */
/**
 * Native demos are always allowed: https on dynamic.dev (individual demos'
 * subdomains) or dynamic.xyz (the demo.dynamic.xyz catalog + other Dynamic
 * subdomains) - apex or any true subdomain of either.
 */
export function isBuiltinTrackOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "dynamic.dev" ||
    host.endsWith(".dynamic.dev") ||
    host === "dynamic.xyz" ||
    host.endsWith(".dynamic.xyz")
  );
}

/** Single origin policy for all tracker endpoints: builtin or env-allowlisted. */
export function isAllowedTrackOrigin(
  origin: string | null,
  allowed: string[],
): boolean {
  if (!origin) return false;
  return isBuiltinTrackOrigin(origin) || allowed.includes(origin.toLowerCase());
}

export function corsHeadersForOrigin(
  origin: string | null,
  allowed: string[],
): Record<string, string> | null {
  if (!origin || !isAllowedTrackOrigin(origin, allowed)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // The tracker drains on unload via navigator.sendBeacon, which always
    // sends credentials: "include"; without this the cross-origin beacon
    // (and its preflight) is rejected. Safe here: the origin is reflected
    // verbatim (never "*"), and the ingest ignores cookies entirely.
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/** `corsHeadersForOrigin` against the live `TRACK_CORS_ORIGINS` env var. */
export function trackCorsHeaders(
  origin: string | null,
): Record<string, string> | null {
  return corsHeadersForOrigin(origin, parseTrackCorsOrigins(env.TRACK_CORS_ORIGINS));
}

/** OPTIONS preflight handler for track endpoints. */
export function trackCorsOptions(request: Request): NextResponse {
  const origin = request.headers.get("origin");
  const headers = trackCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers: headers ?? {} });
}
