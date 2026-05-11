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
 * The factory's defaults handle everything else (`configIdSource: "query"`,
 * `oauthCallbackParams: ["dynamicOauthCode"]`, returnTo round-trip, etc.).
 */
export const middleware = createDemoMiddleware({
  demoType: "remittance",
  publicRoutes: ["/login"],
  defaultReturnPath: "/",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
