/**
 * Exchange Adapter Types
 *
 * Defines the interface for exchange providers and adapters used as
 * funding/deposit sources in the payment widget.
 *
 * Architecture:
 * - `ExchangeProvider` — display-only config (used by UI components)
 * - `ExchangeAdapter` — extends provider with behavior (getBalances, checkWhitelisting)
 *
 * UI components that only need display info (wallet-selector-screen, connect-wallet-screen)
 * accept `ExchangeProvider`. Components that need to fetch data use `ExchangeAdapter`.
 * Since `ExchangeAdapter extends ExchangeProvider`, adapter objects satisfy both.
 *
 * @module lib/exchanges/types
 */

import type { TokenAsset } from "@/lib/balance-utils";

// =============================================================================
// PROVIDER (display config)
// =============================================================================

/**
 * Exchange provider definition.
 * Represents the display/identity config for an exchange.
 * Used by UI components that only need name, icon, and connection info.
 */
export interface ExchangeProvider {
  /** Unique key identifying the exchange (e.g., "kraken") */
  key: string;
  /** Display name shown in the UI (e.g., "Kraken Exchange") */
  name: string;
  /** Icon URL for the exchange logo (used as fallback if iconComponent not provided) */
  iconUrl?: string;
  /**
   * React component type for the exchange icon.
   * Accepts `fill` and `className` props for customization.
   * Takes precedence over iconUrl when provided.
   */
  iconComponent?: React.ComponentType<{ fill?: string; className?: string }>;
  /**
   * Social/OAuth provider identifier used with `authenticateWithSocial`.
   * Maps to Dynamic SDK's SocialProvider type.
   */
  socialProvider: string;
  /** URL to open the exchange website (for whitelisting, etc.) */
  websiteUrl: string;
}

// =============================================================================
// ADAPTER (display config + behavior)
// =============================================================================

/**
 * Result of checking whether a destination address is whitelisted on an exchange.
 */
export interface WhitelistCheckResult {
  /** Whether the exchange enforces address whitelisting */
  required: boolean;
  /** Whether the specific destination address is whitelisted */
  isWhitelisted: boolean;
}

/**
 * Parameters for creating an exchange transfer.
 */
export interface ExchangeTransferParams {
  /** Destination wallet address */
  to: string;
  /** Amount to transfer */
  amount: number;
  /** Currency symbol (e.g., "USDC") */
  currency: string;
  /** Settlement chain type (e.g., "EVM") */
  chainName: string;
  /** Settlement chain ID as string (e.g., "8453" for Base) */
  networkId: string;
  /** Idempotency key to prevent duplicate transfers (use transaction ID) */
  idempotencyKey?: string;
  /** MFA code if required by the exchange */
  mfaCode?: string;
}

/**
 * Result of an exchange transfer.
 */
export interface ExchangeTransferResult {
  /** Exchange-assigned transfer ID */
  transferId: string;
  /** Transfer status from the exchange */
  status?: string;
  /** Amount transferred */
  amount: number;
  /** Currency transferred */
  currency: string;
}

/**
 * Exchange adapter — extends ExchangeProvider with behavior.
 *
 * Each exchange implements this interface to encapsulate ALL
 * exchange-specific logic (balance fetching, whitelisting, transfers).
 * Adding a new exchange is just creating a new adapter.
 */
export interface ExchangeAdapter extends ExchangeProvider {
  /** Fetch available token balances from this exchange */
  getBalances(): Promise<TokenAsset[]>;

  /**
   * Check if a destination address (and optionally a specific currency)
   * is whitelisted for withdrawal. Kraken whitelists by address+token pair.
   * Returns `{ required: false, isWhitelisted: true }` if the exchange
   * does not enforce whitelisting.
   */
  checkWhitelisting(
    destinationAddress: string,
    currency?: string,
  ): Promise<WhitelistCheckResult>;

  /**
   * Create a transfer from the exchange to a destination address.
   * Handles account selection internally (picks the first account with sufficient balance).
   */
  createTransfer(
    params: ExchangeTransferParams,
  ): Promise<ExchangeTransferResult>;
}

// =============================================================================
// LEGACY / SHARED TYPES
// =============================================================================

/**
 * Whitelisted address destination from an exchange.
 */
export interface ExchangeWhitelistDestination {
  address: string;
  tokens?: string[];
}

/**
 * Response from checking exchange whitelisting status.
 */
export interface ExchangeWhitelistData {
  /** Whether the exchange enforces address whitelisting */
  enforcesAddressWhitelist: boolean;
  /** List of whitelisted destination addresses */
  destinations: ExchangeWhitelistDestination[];
}
