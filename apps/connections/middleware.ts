import { createConfigForwardingMiddleware } from "@dynamic-demos/dynamic/config-forwarder";

/**
 * Every connect route is public. This is a connect-only flow: the user picks a
 * wallet, we read its public address, and we hand that back to the caller - no
 * session, no JWT, nothing to gate. Auth-gating here would also break the two
 * embed targets (`/connect`, `/headless`), which run inside an iframe or a
 * native webview where a redirect to a login page has nowhere to go.
 *
 * The shared forwarder resolves the brand id from `?theme=` (or the sticky
 * `connections_config_id` cookie) and forwards `x-connections-config-id` to the
 * layout. All three strings derive from `demoType` below and must agree with the
 * dashboard's `DemoConfigKind`; nothing type-checks that, so changing one here
 * without the API kind yields a resolving cookie and a 400 fetch - which renders
 * branded chrome over an unbranded page rather than failing outright.
 */
export const middleware = createConfigForwardingMiddleware({
  demoType: "connections",
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
