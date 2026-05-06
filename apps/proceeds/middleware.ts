import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";

/**
 * All routes are protected except /login.
 *
 * Proceeds has no per-config concept (`configIdSource: 'none'`); the
 * factory bypasses cookie/header sync entirely.
 *
 * Authed user on `/` → redirect to `/payment-methods`.
 * Authed user on login → redirect to returnTo or `/payment-methods`.
 * Unauthed on protected route → redirect to `/login` with returnTo.
 */
export const middleware = createDemoMiddleware({
  demoType: "proceeds",
  defaultReturnPath: "/payment-methods",
  authenticatedRootRedirect: "/payment-methods",
  configIdSource: "none",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
