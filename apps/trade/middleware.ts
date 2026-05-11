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
 */
export const middleware = createDemoMiddleware({
  demoType: "trade",
  publicRoutes: ["/login"],
  defaultReturnPath: appConfig.defaultReturnPath,
  authenticatedRootRedirect: appConfig.defaultReturnPath,
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
