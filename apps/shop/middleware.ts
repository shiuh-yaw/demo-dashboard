import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Browse and cart routes are unauthenticated — auth happens client-side
 * inside the checkout modal via the Dynamic SDK widget. We use the
 * shared config-forwarding middleware (header + sticky cookie) instead
 * of `createDemoMiddleware`, whose auth-gating branch causes a redirect
 * loop on `/` for client-side-auth apps.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "shop",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
