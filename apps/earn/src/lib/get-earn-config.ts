import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";
import { DEFAULT_EARN_CONFIG } from "@/lib/earn-config";

/**
 * Resolved earn config for one request.
 *
 * Wrapped in `React.cache` so `generateMetadata`, the layouts and the page share
 * one fetch (the fetch itself is `no-store`).
 *
 * `isBranded` is whether the config resolved, not whether a config id was
 * present. The id only says a brand was requested; keying chrome off it renders
 * branded chrome over an unbranded page whenever the fetch fails. Inspecting the
 * config cannot substitute here either - the fallback is a fully populated
 * `DEFAULT_EARN_CONFIG`, so it is never empty.
 */
export const getEarnConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-earn-config-id");
  const { config, resolved } = await fetchDemoConfigResult({
    demoType: "earn",
    id: configId,
    fallback: DEFAULT_EARN_CONFIG,
  });
  return { configId, config, isBranded: resolved };
});
