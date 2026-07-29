import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Card auth is entirely client-side via the JS SDK - no server-rendered
 * protected routes. Use the shared config-forwarding middleware (header +
 * sticky cookie + query->cookie precedence), NOT createDemoMiddleware, whose
 * auth-gating branch causes a redirect loop on "/" for client-auth apps.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "card",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
