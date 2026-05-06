import { createSyncCookieRoute } from "@dynamic-demos/dynamic/auth-cookies";

/**
 * POST /api/auth/sync-cookie
 *
 * Sets the Dynamic JWT as an httpOnly cookie via the package factory.
 * Plain API route (not server action) → no RSC re-render mid-OAuth-callback.
 */
export const POST = createSyncCookieRoute();
