import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

/**
 * All routes are protected except /login.
 *
 * - `?id=<configId>` → set `visa_direct_config_id` cookie + forward as
 *   `x-visa-direct-config-id` header.
 * - `?id=` (empty) → clear cookie.
 * - Authed user on login → redirect to returnTo or `/payment-methods`.
 * - Authed user on `/` → redirect to `/payment-methods` landing.
 * - Unauthed on protected route → redirect to `/login` with `returnTo`.
 */
export const middleware = createDemoMiddleware({
  demoType: "visa-direct",
  defaultReturnPath: "/payment-methods",
  authenticatedRootRedirect: "/payment-methods",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
