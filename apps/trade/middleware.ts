import { createDemoMiddleware } from "@dynamic-demos/dynamic/demo-middleware";
import { appConfig } from "./app.config";

/**
 * Trade middleware (D-008, simplified).
 *
 * Cookie + query-param based config resolution only. The previous
 * `/t/[id]/<rest>` path-prefix scheme has been retired in favor of the
 * canonical `?theme=<configId>` deep-link contract used by all demos. The
 * underlying flat routes (`/portfolio`, `/login`, …) are now canonical;
 * `next.config.ts` provides a back-compat redirect from `/t/[id]/<rest>`
 * to `/<rest>?theme=[id]`.
 *
 * "/" IS the login surface - the scenario front door (live login card +
 * code panel). Listed first in publicRoutes so it becomes the derived
 * loginPath: unauthenticated users on protected routes land on "/",
 * authenticated visitors on "/" bounce to defaultReturnPath. The legacy
 * /login route 307s to "/" (page-level, query preserved) but stays
 * public so that redirect can run.
 */
export const middleware = createDemoMiddleware({
  demoType: "trade",
  publicRoutes: ["/", "/login"],
  defaultReturnPath: appConfig.defaultReturnPath,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
