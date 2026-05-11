import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * All checkouts routes are public — auth happens client-side inside
 * the Dynamic SDK widget. The shared config-forwarding middleware
 * resolves the brand id from `?theme=` (or the sticky
 * `checkouts_config_id` cookie) and forwards `x-checkouts-config-id`
 * to the layout / page. Legacy `/w/:id/...` URLs are handled by
 * `next.config.ts` redirects, so the middleware no longer needs a
 * special path-extraction branch.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "checkouts",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
