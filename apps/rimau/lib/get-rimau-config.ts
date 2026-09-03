import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { fetchDemoConfigResult } from "@dynamic-demos/theme/fetch-demo-config";
import type { RimauConfig } from "@/lib/rimau-config";

/**
 * Resolved Rimau config for one request. `React.cache` so generateMetadata,
 * the layout and the page share a single fetch (the fetch itself is
 * `no-store`).
 *
 * `isBranded` keys off `resolved`, not off the presence of an id: the id only
 * says a brand was requested, and a failed fetch must render the unbranded
 * chrome rather than branded chrome over an unbranded page.
 */
export const getRimauConfig = cache(async () => {
  const headersList = await headers();
  const configId = headersList.get("x-rimau-config-id");
  const { config, resolved } = await fetchDemoConfigResult<RimauConfig>({
    demoType: "rimau",
    id: configId,
    fallback: {},
  });
  return { configId, config, isBranded: resolved };
});
