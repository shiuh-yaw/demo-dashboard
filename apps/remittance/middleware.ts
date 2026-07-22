import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

/**
 * Remittance middleware — flat routes only.
 *
 * URL contract (post-Phase-4-app):
 *   - `?theme=<configId>` sets the `remittance_config_id` cookie (factory default
 *     `stickyConfigCookie: true`) + forwards `x-remittance-config-id`.
 *   - `?theme=` (empty) clears the cookie.
 *   - Subsequent visits without `?theme=` reuse the cookie.
 *   - There are no path-based config routes. Legacy `/r/[id]/*` URLs are
 *     redirected to `/?theme=[id]` via `next.config.ts` for back-compat.
 *
 * "/" IS the login surface - the scenario front door (live login card +
 * code panel). Listed first in publicRoutes so it becomes the derived
 * loginPath: unauthenticated users on protected routes land on "/",
 * authenticated visitors on "/" bounce to defaultReturnPath. The legacy
 * /login route 307s to "/" (page-level, query preserved) but stays
 * public so that redirect can run.
 *
 * The factory's defaults handle everything else (`configIdSource: "query"`,
 * `oauthCallbackParams: ["dynamicOauthCode"]`, returnTo round-trip, etc.).
 */
export const middleware = createDemoMiddleware({
  demoType: "remittance",
  publicRoutes: ["/", "/login"],
  defaultReturnPath: "/overview",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
