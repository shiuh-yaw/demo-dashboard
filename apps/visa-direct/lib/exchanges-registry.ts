/**
 * Display registry for CeFi exchanges.
 *
 * The list of exchanges *available* comes from Dynamic's
 * `getAvailableExchanges()` (driven by the dashboard config). This
 * registry adds the presentation layer — name, logo, website, and
 * whether we have deep Dynamic API support (balance / deposit-address
 * auto-fetch) for that exchange.
 *
 * To add a new exchange, drop an entry in `EXCHANGE_REGISTRY`. If the
 * Dynamic SDK exposes balance / deposit helpers for it, flip
 * `supportsAutoDepositFetch` to `true` and wire the new adapter into
 * `use-kraken.ts` (rename if the name gets misleading).
 */

import type { ComponentType } from "react";
import { KrakenLogo } from "@dynamic-demos/ui";

export interface ExchangeDisplay {
  /** Matches `AvailableExchange.exchange` (e.g. "kraken"). */
  key: string;
  /** Human-readable display name. */
  name: string;
  /** Public website URL for the exchange. */
  websiteUrl: string;
  /** Tagline shown in the intro step. */
  tagline: string;
  /**
   * Optional logo component. Defaults to a text monogram when absent.
   * The component should render at roughly 10×10 (w-10 h-10) and fill
   * its container.
   */
  Logo?: ComponentType<{ className?: string }>;
  /**
   * Whether Dynamic's SDK + our server route can fetch the user's
   * deposit address automatically for this exchange. When false, the
   * modal skips auto-fetch and goes straight to manual paste.
   */
  supportsAutoDepositFetch: boolean;
}

const REGISTRY: Record<string, ExchangeDisplay> = {
  kraken: {
    key: "kraken",
    name: "Kraken",
    websiteUrl: "https://www.kraken.com",
    tagline: "Receive USDC payouts to your account",
    Logo: KrakenLogo,
    supportsAutoDepositFetch: true,
  },
  coinbase: {
    key: "coinbase",
    name: "Coinbase",
    websiteUrl: "https://www.coinbase.com",
    tagline: "Receive USDC payouts to your account",
    // Dynamic doesn't yet proxy Coinbase deposit-address retrieval the
    // way it does for Kraken. The `fetchDepositAddress` mutation in
    // `use-cefi.ts` will try the Kraken endpoint first, fail gracefully
    // for Coinbase, then fall back to `deriveDemoDepositAddress` (keyed
    // on the user's Coinbase `verifiedCredentialId`) so the UX mirrors
    // Kraken's auto-confirm flow end-to-end for the demo. Flip back to
    // `false` once Dynamic ships a real Coinbase deposit-address proxy
    // and a live call is preferred over the deterministic demo value.
    supportsAutoDepositFetch: true,
  },
};

/**
 * Look up display info for an exchange key. Falls back to a generic
 * placeholder if the key isn't in the registry, so new Dynamic-side
 * exchanges don't crash the UI before we can wire proper branding.
 */
export function getExchangeDisplay(key: string): ExchangeDisplay {
  return (
    REGISTRY[key.toLowerCase()] ?? {
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      websiteUrl: "",
      tagline: "Receive USDC payouts to your account",
      supportsAutoDepositFetch: false,
    }
  );
}
