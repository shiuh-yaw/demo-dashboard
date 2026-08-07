import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Accounts' auth is entirely client-side via the Dynamic SDK - no
 * server-rendered protected routes, so there is nothing to gate. Same
 * choice as wallet: the config-forwarding middleware (header + sticky
 * cookie + query precedence) rather than `createDemoMiddleware`, whose
 * auth-gating branch would redirect-loop on `/`.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "accounts",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
