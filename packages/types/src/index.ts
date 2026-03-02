/**
 * Shared Types for Dynamic Demos
 *
 * This package contains types shared across all demo apps.
 */

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Border radius size tokens
 * - xs: Sharp/minimal corners
 * - sm: Compact corners
 * - md: Default balanced corners
 * - lg: Rounded/soft corners
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Supported brand/logo types
 * - "dynamic": Dynamic Labs logo
 * - "custom": Custom logo via logoUrl
 */
export type Brand = "dynamic" | "custom";

// =============================================================================
// Chain & Settlement Types
// =============================================================================

/**
 * Supported blockchain types
 */
export type Chain = "EVM" | "SOL";

/**
 * Settlement chain configuration
 * Defines where swapped tokens are sent
 */
export interface SettlementConfig {
  /** Chain type: "EVM" or "SOL" */
  chain: Chain;
  /** Chain ID (e.g., 8453 for Base, 1151111081099710 for Solana via LI.FI) */
  chainId: number;
  /** Chain name for display */
  chainName: string;
  /** Token address (contract address for EVM, mint address for Solana) */
  tokenAddress: string;
  /** Token symbol (e.g., "USDC", "SOL") */
  tokenSymbol?: string;
  /** Token decimals (e.g., 6 for USDC) */
  decimals: number;
}

// =============================================================================
// Branding Types
// =============================================================================

/**
 * Base branding configuration shared across all demo types
 */
export interface BaseBranding {
  /** Which logo to display */
  logo: Brand;
  /** URL to a hosted logo (used when logo is "custom") */
  logoUrl?: string;
  /** Brand/company name */
  name?: string;
  /** Show "Powered by Dynamic" footer watermark */
  showPoweredBy?: boolean;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// Timestamp Types
// =============================================================================

/**
 * Entity with standard timestamps
 */
export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

/**
 * Entity with optional completion timestamp
 */
export interface Completable extends Timestamped {
  completedAt?: string;
}
