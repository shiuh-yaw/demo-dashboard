"use client";

/**
 * Gas Sponsorship Configuration
 *
 * Check which networks have gas sponsorship configured in the Dynamic dashboard.
 * Matches wallet app approach: exact networkId match from projectSettings.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/zerodev/can-sponsor-transaction
 */

import { getClient } from "./client";

export function getSponsoredNetworkIds(): string[] {
  const client = getClient();
  if (!client?.projectSettings) return [];

  const zerodevProvider = client.projectSettings.providers?.find(
    (p) => p.provider === "zerodev",
  );

  if (!zerodevProvider) return [];

  const sponsoredNetworks =
    zerodevProvider.multichainAccountAbstractionProviders?.map(
      (p) => p.chain,
    ) ?? [];

  return sponsoredNetworks;
}

export function isNetworkSponsored(networkId: string): boolean {
  const sponsoredNetworks = getSponsoredNetworkIds();
  return sponsoredNetworks.includes(networkId);
}
