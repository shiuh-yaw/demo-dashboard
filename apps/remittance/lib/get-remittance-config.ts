import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";
import type { RemittanceConfig } from "@/lib/remittance-config";

/**
 * Resolved remittance config for one request.
 *
 * Wrapped in `React.cache` so `generateMetadata`, the layout and the page share
 * one fetch (the fetch itself is `no-store`).
 *
 * `isBranded` is whether the config resolved, not whether a config id was
 * present. The id only says a brand was requested; keying chrome off it renders
 * branded chrome over an unbranded page whenever the fetch fails.
 */
export const getRemittanceConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-remittance-config-id");
  const { config, resolved } = await fetchDemoConfigResult<RemittanceConfig>({
    demoType: "remittance",
    id: configId,
    fallback: {},
  });
  return { configId, config, isBranded: resolved };
});
