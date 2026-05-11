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
 * Path-based `/e/[id]/...` routing was removed. Back-compat redirect
 * lives in `next.config.ts` (`/e/:id/(.*)` → `/?theme=:id`).
 */
export const middleware = createDemoMiddleware({
  demoType: "earn",
  publicRoutes: ["/login"],
  defaultReturnPath: "/earn",
  authenticatedRootRedirect: "/earn",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
