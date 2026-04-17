/**
 * Shared cookie utilities for Dynamic JWT auth.
 *
 * Used by both the server action (`session.ts`) and the API route
 * (`/api/auth/sync-cookie`) so the cookie name and expiration policy
 * stay in lockstep.
 */

import jwt from "jsonwebtoken";

export const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days fallback

/**
 * Compute cookie maxAge from the JWT exp claim, clamped to a sane range.
 */
export function getJwtExpirationSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      return Math.max(60, Math.min(remaining, DEFAULT_COOKIE_MAX_AGE));
    }
  } catch {
    // ignore
  }
  return DEFAULT_COOKIE_MAX_AGE;
}
