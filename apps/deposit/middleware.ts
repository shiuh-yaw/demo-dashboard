import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Deposit's auth is client-side via the Dynamic SDK widget; `app/api/*`
 * routes verify JWTs themselves via `requireUserId`. We use the shared
 * config-forwarding middleware (header + sticky cookie) instead of
 * `createDemoMiddleware`, whose auth-gating branch causes a redirect
 * loop on `/` for client-side-auth apps.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "deposit",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
