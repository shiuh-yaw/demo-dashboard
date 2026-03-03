/**
 * Admin Assets Handler
 */

import { getSupportedAssets } from "@dynamic-demos/fireblocks";

export async function handleListAssets() {
  const assets = await getSupportedAssets();

  const relevant = assets.filter(
    (a) =>
      /usdc|base|usd|stable/i.test(a.id) ||
      /usdc|base|usd|stable/i.test(a.name ?? ""),
  );

  return {
    assets: relevant.length > 0 ? relevant : assets.slice(0, 50),
    total: assets.length,
  };
}
