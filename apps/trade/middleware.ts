import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";
import { appConfig } from "./app.config";

const TRADE_CONFIG_PREFIX = /^\/t\/([^/]+)(\/.*)?$/;

/**
 * Trade routes config-prefix paths (`/t/[id]/...`) onto a flat app
 * structure. Middleware:
 *   - Extracts the config id, persists it to `trade_config_id` cookie,
 *     forwards as `x-trade-config-id` header.
 *   - Rewrites `/t/[id]/<rest>` → `/<rest>` (or `defaultReturnPath` if rest empty)
 *     so the underlying flat routes (`/portfolio`, `/login`, …) handle the request.
 *   - Redirects unauthenticated users on protected routes to `/t/[id]/login`
 *     (config-aware) or `/login`.
 */
export const middleware = createDemoMiddleware({
  demoType: "trade",
  defaultReturnPath: (configId) =>
    configId
      ? `/t/${configId}${appConfig.defaultReturnPath}`
      : appConfig.defaultReturnPath,
  loginPath: (configId) => (configId ? `/t/${configId}/login` : "/login"),
  configIdSource: "path",
  getConfigIdFromPath: (path) => path.match(TRADE_CONFIG_PREFIX)?.[1] ?? null,
  rewritePath: (path) => {
    const m = path.match(TRADE_CONFIG_PREFIX);
    if (!m) return path;
    return m[2] ?? appConfig.defaultReturnPath;
  },
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
