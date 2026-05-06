/**
 * JWT cookie sync helpers (server-side).
 *
 * These complement {@link "./jwt"} (which verifies + reads tokens) with
 * write helpers that demo apps use to persist the Dynamic JWT after the
 * client SDK obtains it.
 *
 * Apps invoke `setDynamicJwtCookie` from a server action OR a plain API
 * route — both are wired below. The route variant avoids RSC re-render
 * mid-OAuth-callback (matches the proceeds/visa-direct pattern).
 */

import jwt from "jsonwebtoken";

const DEFAULT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MIN_MAX_AGE = 60;

/**
 * Minimal cookie store interface — compatible with `next/headers` `cookies()`.
 * Use a structural type so callers don't have to import next types in libs.
 *
 * Return types are deliberately `unknown` so the interface accepts both Next's
 * `ReadonlyRequestCookies` (which returns `ResponseCookies`) and simple test
 * doubles that return `void`.
 */
export interface CookieStore {
  set(
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ): unknown;
  delete(name: string): unknown;
  get?(name: string): { value: string } | undefined;
}

export interface SetDynamicJwtCookieOptions {
  /** Override cookie name. Default: `dynamic_jwt`. */
  cookieName?: string;
  /** Override secure flag. Default: `process.env.NODE_ENV === "production"`. */
  secure?: boolean;
}

/**
 * Compute the cookie max-age (in seconds) from a JWT's `exp` claim.
 * Clamps to [60, 7 days].
 */
export function getJwtMaxAgeSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      return Math.max(MIN_MAX_AGE, Math.min(remaining, DEFAULT_MAX_AGE));
    }
  } catch {
    // ignore decode errors and fall through
  }
  return DEFAULT_MAX_AGE;
}

/**
 * Set the Dynamic JWT cookie. Computes max-age from the JWT exp claim.
 *
 * Use from a server action (Next.js `"use server"`) or inside a route handler.
 */
export async function setDynamicJwtCookie(
  cookieStore: CookieStore,
  token: string,
  options: SetDynamicJwtCookieOptions = {},
): Promise<void> {
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const secure = options.secure ?? process.env.NODE_ENV === "production";
  const maxAge = getJwtMaxAgeSeconds(token);

  await cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

/**
 * Clear the Dynamic JWT cookie.
 */
export async function clearDynamicJwtCookie(
  cookieStore: CookieStore,
  options: { cookieName?: string } = {},
): Promise<void> {
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  await cookieStore.delete(cookieName);
}

/**
 * Factory: build a Next.js POST route handler for `/api/auth/sync-cookie`.
 *
 * The handler reads `{ token }` from the JSON body and persists it via
 * {@link setDynamicJwtCookie}. Apps mount this at
 * `app/api/auth/sync-cookie/route.ts`:
 *
 * ```ts
 * import { createSyncCookieRoute } from "@dynamic-demos/dynamic/auth-cookies";
 * export const POST = createSyncCookieRoute();
 * ```
 *
 * Avoids the server-action RSC re-render race during OAuth callback.
 */
export function createSyncCookieRoute(options: SetDynamicJwtCookieOptions = {}) {
  return async function POST(req: Request): Promise<Response> {
    try {
      const body = (await req.json()) as { token?: unknown };
      if (!body || typeof body.token !== "string" || !body.token) {
        return Response.json(
          { success: false, error: "Missing token" },
          { status: 400 },
        );
      }
      // Lazy-import next/headers so consumers without Next aren't broken.
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      await setDynamicJwtCookie(cookieStore, body.token, options);
      return Response.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to set auth cookie";
      return Response.json({ success: false, error: message }, { status: 500 });
    }
  };
}
