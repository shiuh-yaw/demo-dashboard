"use client";

/**
 * CeFi exchange discovery from Dynamic project settings.
 *
 * The list of available exchanges for a given Dynamic environment comes
 * from two places in `projectSettings`:
 *
 *  1. `sdk.exchangeOptions[]`   — exchanges the env has opted-in to
 *     (e.g. Coinbase, Kraken). Each entry names the matching
 *     `socialProvider` used to authenticate via OAuth.
 *  2. `providers[]`              — per-provider credential records
 *     (clientId / clientSecret). An exchange is only "linkable" if
 *     credentials exist for its social provider.
 *
 * We intersect those two lists so the UI only surfaces exchanges that
 * are both enabled for this env AND have OAuth credentials wired up.
 */

import { getClient } from "./client";

export interface AvailableExchange {
  /** Exchange identifier (e.g. "kraken", "coinbase"). */
  exchange: string;
  /** Social OAuth provider used for linking (e.g. "kraken", "coinbasesocial"). */
  socialProvider: string;
}

export function getAvailableExchanges(): AvailableExchange[] {
  const client = getClient();
  if (!client?.projectSettings) return [];

  const sdk = client.projectSettings.sdk;
  const options = sdk?.exchangeOptions ?? [];
  const providers = client.projectSettings.providers ?? [];

  return options
    .filter((o) => !!o.socialProvider)
    .filter((o) =>
      providers.some(
        (p) => String(p.provider) === String(o.socialProvider),
      ),
    )
    .map((o) => ({
      exchange: String(o.exchange),
      socialProvider: String(o.socialProvider),
    }));
}
