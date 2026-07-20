import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

/**
 * Earn middleware (D-008 unified pattern).
 *
 * URL contract is cookie + query param only:
 *   - `?theme=<configId>` resolves the config and persists `earn_config_id`
 *     as a sticky cookie (default `stickyConfigCookie: true`).
 *   - Subsequent navigations carry the cookie; the factory forwards the
 *     resolved id as `x-earn-config-id` to the app.
 *
 * "/" IS the login surface - the scenario front door (live login card +
 * code panel). Listed first in publicRoutes so it becomes the derived
 * loginPath: unauthenticated users on protected routes land on "/",
 * authenticated users on "/" bounce straight to /earn. The legacy
 * /login route 307s to "/" (page-level redirect, query preserved for
 * OAuth callbacks) but stays public so that redirect can run.
 *
 * Path-based `/e/[id]/...` routing was removed. Back-compat redirect
 * lives in `next.config.ts` (`/e/:id/(.*)` → `/?theme=:id`).
 */
export const middleware = createDemoMiddleware({
  demoType: "earn",
  publicRoutes: ["/", "/login"],
  defaultReturnPath: "/earn",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
