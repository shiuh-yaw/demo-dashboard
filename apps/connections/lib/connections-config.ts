import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import type { WidgetConfig } from "@dynamic-demos/theme";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";

import { env } from "@/lib/env";

/**
 * What the dashboard actually stores for `kind: "connections"`.
 *
 * The theme half is `WidgetConfig`'s, but the branding half is NOT: the writer
 * (`createProspectDemoConfigs`) emits `{ logoUrl, appName }` while
 * `WidgetBranding` declares `{ logo, name }`. Typing this as a plain
 * `WidgetConfig` therefore compiles cleanly and reads `undefined` at runtime,
 * which is why the brand logo never appeared and the page title never picked up
 * the prospect name. The stored key wins - existing configs (prod included) are
 * on `logoUrl`.
 */
export type ConnectConfig = Omit<WidgetConfig, "branding"> & {
  branding?: {
    logoUrl?: string;
    appName?: string;
    showPoweredBy?: boolean;
  };
};

/**
 * The one place this app resolves its brand config.
 *
 * Two things have to be right and neither is enforced by types, which is why
 * they live here rather than at each call site:
 *
 *  1. `dashboardUrl` must be passed. Left off, `fetchDemoConfig` falls back to
 *     sniffing `DASHBOARD_URL` / `NEXT_PUBLIC_DASHBOARD_URL` /
 *     `NEXT_PUBLIC_DASHBOARD_API_URL` / `NEXT_PUBLIC_API_BASE_URL` - none of
 *     which is `DASHBOARD_API_URL`, the name this app actually validates. The
 *     result is a warning on the server and the default palette in the browser:
 *     every `?theme=` request silently renders unbranded.
 *  2. It must be wrapped in `React.cache`, so `generateMetadata`, the layout and
 *     the page share one fetch per request (the fetch itself is `no-store`).
 *
 * An empty object is the fallback on purpose: an unthemed render emits NO
 * overrides, leaving the canonical palette from `@dynamic-demos/theme`.
 */
export const getConnectConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-connections-config-id");
  const { config, resolved } = await fetchDemoConfigResult<ConnectConfig>({
    demoType: "connections",
    id: configId,
    fallback: {},
    dashboardUrl: env.DASHBOARD_API_URL,
  });
  return { configId, config, isBranded: resolved };
});
