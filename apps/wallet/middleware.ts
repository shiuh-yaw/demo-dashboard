import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Wallet's auth is entirely client-side via the Dynamic SDK widget — no
 * server-rendered protected routes. We use the shared config-forwarding
 * middleware (header + sticky cookie + query→cookie precedence) instead
 * of `createDemoMiddleware`, whose auth-gating branch causes a redirect
 * loop on `/` for client-side-auth apps.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "wallet",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
