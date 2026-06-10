/**
 * Exchange Adapter Types
 *
 * Defines the interface for exchange providers and adapters used as
 * funding sources in the Flow demos. Mirrors the adapter pattern from
 * apps/checkouts — new exchanges implement `ExchangeAdapter` and
 * register in `index.ts`.
 *
 * @module lib/exchanges/types
 */

import type { TokenAsset } from "@dynamic-demos/checkouts-widget";

// =============================================================================
// PROVIDER (display config)
// =============================================================================

export interface ExchangeProvider {
  key: string;
  name: string;
  iconUrl?: string;
  iconComponent?: React.ComponentType<{ fill?: string; className?: string }>;
  socialProvider: string;
  websiteUrl: string;
}

// =============================================================================
// ADAPTER (display config + behavior)
// =============================================================================

export interface WhitelistCheckResult {
  required: boolean;
  isWhitelisted: boolean;
}

export interface ExchangeTransferParams {
  to: string;
  amount: number;
  currency: string;
  chainName: string;
  networkId: string;
  idempotencyKey?: string;
  mfaCode?: string;
}

export interface ExchangeTransferResult {
  transferId: string;
  status?: string;
  amount: number;
  currency: string;
}

export interface ExchangeAdapter extends ExchangeProvider {
  getBalances(): Promise<TokenAsset[]>;
  checkWhitelisting(
    destinationAddress: string,
    currency?: string,
  ): Promise<WhitelistCheckResult>;
  createTransfer(
    params: ExchangeTransferParams,
  ): Promise<ExchangeTransferResult>;
}

// =============================================================================
// WHITELISTING TYPES
// =============================================================================

export interface ExchangeWhitelistDestination {
  address: string;
  tokens?: string[];
}

export interface ExchangeWhitelistData {
  enforcesAddressWhitelist: boolean;
  destinations: ExchangeWhitelistDestination[];
}
