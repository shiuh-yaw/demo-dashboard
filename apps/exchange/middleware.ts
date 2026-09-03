import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Exchange's auth is entirely client-side (the Dynamic JS SDK on the scenario
 * page's sign-in card, or the staged simulation) - no server-rendered
 * protected routes. The exchange screens gate themselves on the client, so
 * the shared config-forwarding middleware (header + sticky cookie +
 * query→cookie precedence for `?theme=`) is all this app needs.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "exchange",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
