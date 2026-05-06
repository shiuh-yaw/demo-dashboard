import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

/**
 * All routes are protected except /login (and /r/[id]/login config-route).
 *
 * - `?id=<configId>` (or `/r/[id]/...` path) → set `remittance_config_id`
 *   cookie + forward as `x-remittance-config-id` header.
 * - `?id=` (empty) → clear cookie.
 * - Authed user on login (no OAuth params) → redirect to returnTo or
 *   `/r/[id]/dashboard` (when on a config route) or `/`.
 * - Unauthed on protected route → redirect to `/login` (or `/r/[id]/login`).
 */
export const middleware = createDemoMiddleware({
  demoType: "remittance",
  publicRoutes: ["/login", /^\/r\/[^/]+\/login(\/|$)/],
  loginPath: (configId) => (configId ? `/r/${configId}/login` : "/login"),
  defaultReturnPath: (configId) => (configId ? `/r/${configId}/dashboard` : "/"),
  // Header-only forwarding (no Set-Cookie). Deep-links honor URL state, not
  // cookie state — see docs/projects/demo-meta-system/research/dynamic-auth-patterns.md.
  stickyConfigCookie: false,
  configIdSource: "both",
  getConfigIdFromPath: (path) => path.match(/^\/r\/([^/]+)/)?.[1] ?? null,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
