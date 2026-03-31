/**
 * Dashboard Types
 *
 * Types for the demo dashboard configurations.
 */

import type { WidgetConfig } from "../widget-config";

// =============================================================================
// Checkout Configuration
// =============================================================================

/**
 * Checkout mode - deposit or payment
 */
export type CheckoutMode = "deposit" | "payment";

/**
 * Stored checkout configuration with metadata
 * @alias StoredWidgetConfig for backwards compatibility
 */
export interface StoredCheckoutConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** Checkout mode - deposit or payment */
  mode?: CheckoutMode;
  /** The actual widget configuration */
  config: WidgetConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Owner ID who owns this config */
  ownerId?: string;
}

/**
 * @deprecated Use StoredCheckoutConfig instead
 */
export type StoredWidgetConfig = StoredCheckoutConfig;

/**
 * Request to create a new checkout config
 */
export interface CreateCheckoutConfigRequest {
  name: string;
  description?: string;
  mode?: CheckoutMode;
  config: Partial<WidgetConfig>;
}

/**
 * @deprecated Use CreateCheckoutConfigRequest instead
 */
export type CreateWidgetConfigRequest = CreateCheckoutConfigRequest;

/**
 * Request to update a checkout config
 */
export interface UpdateCheckoutConfigRequest {
  name?: string;
  description?: string;
  mode?: CheckoutMode;
  config?: Partial<WidgetConfig>;
}

/**
 * @deprecated Use UpdateCheckoutConfigRequest instead
 */
export type UpdateWidgetConfigRequest = UpdateCheckoutConfigRequest;

// =============================================================================
// Earn Configuration (Theme & Branding)
// =============================================================================

/**
 * Supported logo/brand types
 * "custom" allows passing a hosted SVG URL via logoUrl
 */
export type EarnBrand = "dynamic" | "youtube" | "meta" | "remitly" | "custom";

/**
 * Border radius size tokens
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Theme configuration for Earn demo
 */
export interface EarnTheme {
  /** Primary brand color (e.g., brand red, Meta blue) */
  primaryColor?: string;
  /** Primary color hover state */
  primaryHoverColor?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Main background color */
  backgroundColor?: string;
  /** Light background variant */
  backgroundLightColor?: string;
  /** Primary text color */
  foregroundColor?: string;
  /** Secondary/muted text color */
  mutedTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Active/selected background color */
  activeBgColor?: string;
  /** Active/selected text color */
  activeTextColor?: string;
  /** Border radius size */
  borderRadius?: BorderRadiusSize;
}

/**
 * Branding configuration for Earn demo
 */
export interface EarnBranding {
  /** Which logo to display */
  logo: EarnBrand;
  /** URL to a hosted SVG logo (used when logo is "custom") */
  logoUrl?: string;
  /** Token name displayed in balances (e.g., "USDC", "PYUSD") */
  tokenName?: string;
  /** Page title shown on the main earn page (defaults to "Earn") */
  pageTitle?: string;
  /** Page description shown below the title */
  pageDescription?: string;
}

/**
 * Layout/UI configuration for Earn demo
 */
export interface EarnLayout {
  /** Whether to show the sidebar navigation */
  showSidebar?: boolean;
}

/**
 * Full Earn configuration
 */
export interface EarnConfig {
  /** Theme settings */
  theme?: EarnTheme;
  /** Branding settings */
  branding?: EarnBranding;
  /** Layout/UI settings */
  layout?: EarnLayout;
}

/**
 * Default theme for Earn Dashboard
 */
export const DEFAULT_EARN_THEME: Required<EarnTheme> = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  backgroundColor: "#F9F9F9",
  backgroundLightColor: "#FFFFFF",
  foregroundColor: "#030303",
  mutedTextColor: "#606060",
  borderColor: "#DADADA",
  activeBgColor: "#E8F0FE",
  activeTextColor: "#1967D2",
  borderRadius: "md",
};

/**
 * Default branding (Dynamic logo)
 * Note: logoUrl is intentionally omitted as it's only used when logo is "custom"
 */
export const DEFAULT_EARN_BRANDING: Required<
  Pick<EarnBranding, "logo" | "tokenName" | "pageTitle" | "pageDescription">
> = {
  logo: "dynamic",
  tokenName: "USDC",
  pageTitle: "Earn",
  pageDescription: "Manage your earnings, balance, and payouts.",
};

/**
 * Default layout settings
 */
export const DEFAULT_EARN_LAYOUT: Required<EarnLayout> = {
  showSidebar: false,
};

/**
 * Default Earn configuration
 */
export const DEFAULT_EARN_CONFIG: EarnConfig = {
  theme: DEFAULT_EARN_THEME,
  branding: DEFAULT_EARN_BRANDING,
  layout: DEFAULT_EARN_LAYOUT,
};

/**
 * Stored Earn configuration with metadata
 */
export interface StoredEarnConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** The actual Earn configuration */
  config: EarnConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Owner ID who owns this config */
  ownerId?: string;
}

/**
 * Request to create a new Earn config
 */
export interface CreateEarnConfigRequest {
  name: string;
  description?: string;
  config?: Partial<EarnConfig>;
}

/**
 * Request to update an Earn config
 */
export interface UpdateEarnConfigRequest {
  name?: string;
  description?: string;
  config?: Partial<EarnConfig>;
}

// =============================================================================
// Wallet Configuration (Theme & Branding)
// =============================================================================

/**
 * Wallet theme configuration
 * Uses the same --widget-* CSS variables as Checkouts
 */
export interface WalletTheme {
  /** Page background color */
  pageBackground?: string;
  /** Widget card background */
  background?: string;
  /** Primary text color */
  foreground?: string;
  /** Primary button/CTA color */
  primaryColor?: string;
  /** Primary color hover state */
  primaryHoverColor?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Row/list item background */
  rowBackground?: string;
  /** Row hover background */
  rowHoverBackground?: string;
  /** Secondary/muted text color */
  mutedTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Gradient start color */
  gradientFrom?: string;
  /** Gradient end color */
  gradientTo?: string;
  /** Border radius size */
  borderRadius?: BorderRadiusSize;
}

/**
 * Wallet branding configuration
 * Matches Checkouts WidgetBranding structure
 */
export interface WalletBranding {
  /** Logo URL (direct URL like Checkouts) */
  logo?: string;
  /** App name shown in title */
  appName?: string;
  /** Show "Powered by Dynamic" footer */
  showPoweredBy?: boolean;
}

/**
 * Full Wallet configuration
 */
export interface WalletConfig {
  /** Theme settings */
  theme?: WalletTheme;
  /** Branding settings */
  branding?: WalletBranding;
}

/**
 * Default theme for Wallet (matches Checkouts DEFAULT_THEME)
 */
export const DEFAULT_WALLET_THEME: Required<WalletTheme> = {
  pageBackground: "#f6f8fa",
  background: "#ffffff",
  foreground: "#000000",
  primaryColor: "#121212",
  primaryHoverColor: "#2a2a2a",
  accentColor: "#4779FF",
  rowBackground: "#f6f8f8",
  rowHoverBackground: "#eef1f1",
  mutedTextColor: "#9a9a9a",
  borderColor: "#e7e8ed",
  gradientFrom: "#daffff",
  gradientTo: "rgba(218, 255, 255, 0.15)",
  borderRadius: "md",
};

/**
 * Default branding for Wallet (matches Checkouts WidgetBranding)
 */
export const DEFAULT_WALLET_BRANDING: Required<
  Pick<WalletBranding, "appName" | "showPoweredBy">
> & { logo: string } = {
  logo: "",
  appName: "Wallet",
  showPoweredBy: true,
};

/**
 * Default Wallet configuration
 */
export const DEFAULT_WALLET_CONFIG: WalletConfig = {
  theme: DEFAULT_WALLET_THEME,
  branding: DEFAULT_WALLET_BRANDING,
};

/**
 * Stored Wallet configuration with metadata
 */
export interface StoredWalletConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** The actual Wallet configuration */
  config: WalletConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Owner ID who owns this config */
  ownerId?: string;
}

/**
 * Request to create a new Wallet config
 */
export interface CreateWalletConfigRequest {
  name: string;
  description?: string;
  config?: Partial<WalletConfig>;
}

/**
 * Request to update a Wallet config
 */
export interface UpdateWalletConfigRequest {
  name?: string;
  description?: string;
  config?: Partial<WalletConfig>;
}

// =============================================================================
// Remittance Configuration (Theme & Branding)
// =============================================================================

/**
 * Remittance theme - minimal (primary + optional secondary)
 * Matches apps/remittance/lib/remittance-config.ts
 */
export interface RemittanceTheme {
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Remittance branding
 */
export interface RemittanceBranding {
  logoUrl?: string;
}

/**
 * Full Remittance configuration
 */
export interface RemittanceConfig {
  theme?: RemittanceTheme;
  branding?: RemittanceBranding;
}

/**
 * Default theme for Remittance
 */
export const DEFAULT_REMITTANCE_THEME: Required<RemittanceTheme> = {
  primaryColor: "#1a56db",
  secondaryColor: "#1e40af",
};

/**
 * Default Remittance configuration
 */
export const DEFAULT_REMITTANCE_CONFIG: RemittanceConfig = {
  theme: DEFAULT_REMITTANCE_THEME,
  branding: {},
};

/**
 * Stored Remittance configuration with metadata
 */
export interface StoredRemittanceConfig {
  id: string;
  name: string;
  description?: string;
  config: RemittanceConfig;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

// =============================================================================
// Trade Configuration (Theme & Branding)
// =============================================================================

/**
 * Trade theme - primary + secondary colors
 * Matches apps/trade/lib/trade-config.ts TradeTheme
 */
export interface TradeTheme {
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Trade branding
 * Matches apps/trade/lib/trade-config.ts TradeBranding
 */
export interface TradeBranding {
  logoUrl?: string;
  appName?: string;
}

/**
 * Full Trade configuration
 * Matches apps/trade/lib/trade-config.ts TradeConfig
 */
export interface TradeConfig {
  theme?: TradeTheme;
  branding?: TradeBranding;
}

/**
 * Default theme for Trade
 */
export const DEFAULT_TRADE_THEME: Required<TradeTheme> = {
  primaryColor: "#4779FF",
  secondaryColor: "#3563E0",
};

/**
 * Default Trade configuration
 */
export const DEFAULT_TRADE_CONFIG: TradeConfig = {
  theme: DEFAULT_TRADE_THEME,
  branding: {},
};

/**
 * Stored Trade configuration with metadata
 */
export interface StoredTradeConfig {
  id: string;
  name: string;
  description?: string;
  config: TradeConfig;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

// =============================================================================
// Brand Profiles
// =============================================================================

/**
 * Extended theme settings for brand profiles
 * Captures full color palette from AI import, applied to demo configs
 */
export interface BrandTheme {
  /** Primary brand color */
  primaryColor: string;
  /** Primary color hover state */
  primaryHoverColor?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Page/outer background color */
  pageBackground?: string;
  /** Widget/card background color */
  background?: string;
  /** Primary text color */
  foreground?: string;
  /** Secondary/muted text color */
  mutedTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Row/list item background */
  rowBackground?: string;
  /** Row hover background */
  rowHoverBackground?: string;
  /** Gradient start color */
  gradientFrom?: string;
  /** Gradient end color */
  gradientTo?: string;
  /** Border radius size */
  borderRadius?: BorderRadiusSize;
}

/**
 * Shared brand settings applied across all demo types
 */
export interface BrandSettings {
  /** Logo type - "custom" for uploaded/external, "dynamic" for default */
  logo: "custom" | "dynamic";
  /** URL to custom logo (when logo is "custom") */
  logoUrl?: string;
  /** Primary brand color (convenience accessor, also in theme) */
  primaryColor: string;
  /** Accent color for highlights (convenience accessor, also in theme) */
  accentColor?: string;
  /** Border radius size (convenience accessor, also in theme) */
  borderRadius?: BorderRadiusSize;
  /** Full theme settings (captured from AI import) */
  theme?: BrandTheme;
}

/**
 * Demo config references - IDs of auto-generated configs
 */
export interface BrandDemos {
  /** Earn demo config ID */
  earn?: string;
  /** Checkouts demo config ID */
  checkouts?: string;
  /** Wallet demo config ID */
  wallet?: string;
  /** Remittance demo config ID */
  remittance?: string;
}

/**
 * Brand Profile - unified branding across all demo types
 *
 * A brand profile owns shared branding settings that are applied
 * to auto-generated demo configs (Earn, Checkouts, Wallet).
 */
export interface BrandProfile {
  /** Unique identifier */
  id: string;
  /** Display name (e.g., "Acme Corp Demo") */
  name: string;
  /** Company website URL (for auto-extracting brand colors) */
  companyUrl?: string;
  /** Shared brand settings */
  brand: BrandSettings;
  /** Auto-generated demo config IDs */
  demos: BrandDemos;
  /** Owner ID who created this profile */
  ownerId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Default brand theme (full color palette)
 */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  pageBackground: "#f6f8fa",
  background: "#ffffff",
  foreground: "#000000",
  mutedTextColor: "#9a9a9a",
  borderColor: "#e7e8ed",
  rowBackground: "#f6f8f8",
  rowHoverBackground: "#eef1f1",
  gradientFrom: "#daffff",
  gradientTo: "rgba(218, 255, 255, 0.15)",
  borderRadius: "md",
};

/**
 * Default brand settings
 */
export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  logo: "dynamic",
  primaryColor: "#4779FF",
  accentColor: "#1967D2",
  borderRadius: "md",
  theme: DEFAULT_BRAND_THEME,
};

/**
 * Request to create a new brand profile
 */
export interface CreateBrandProfileRequest {
  name: string;
  companyUrl?: string;
  brand?: Partial<BrandSettings>;
  /** Which demos to generate (defaults to all) */
  generateDemos?: {
    earn?: boolean;
    checkouts?: boolean;
    wallet?: boolean;
    remittance?: boolean;
  };
}

/**
 * Request to update a brand profile
 */
export interface UpdateBrandProfileRequest {
  name?: string;
  companyUrl?: string;
  brand?: Partial<BrandSettings>;
}

// =============================================================================
// Token Types
// =============================================================================

/**
 * Token information from LI.FI route data
 */
export interface Token {
  /** Token contract address (0x0000...0000 for native tokens) */
  address: string;
  /** Chain ID where token exists */
  chainId: number;
  /** Token symbol (e.g., "USDC", "ETH") */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Token name (e.g., "USD Coin", "Ethereum") */
  name: string;
  /** Token logo URI */
  logoURI?: string;
  /** Token price in USD */
  priceUSD?: string;
  /** Token coin key identifier */
  coinKey?: string;
  /** Token tags (e.g., ["stablecoin"]) */
  tags?: string[];
}

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * Transaction status constants (single source of truth)
 *
 * Lifecycle:
 * - INITIALIZED: Server created with externalId/metadata (awaiting user action)
 * - DRAFT: Route selected, not yet submitted
 * - SUBMITTED: Transaction hash submitted to chain
 * - PENDING: Waiting for confirmation
 * - CONFIRMED: Successfully completed
 * - FAILED: Transaction failed
 * - EXPIRED: Initialized but never completed (after TTL)
 * - ABANDONED: Draft but never submitted (after TTL)
 */
export const Status = {
  INITIALIZED: "initialized",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  ABANDONED: "abandoned",
} as const;

/** Transaction status type (derived from Status const) */
export type TransactionStatus = (typeof Status)[keyof typeof Status];

/**
 * Transaction record
 */
export interface Transaction {
  /** Unique transaction ID */
  id: string;
  /** Parent checkout ID */
  checkoutId: string;
  /** Current status */
  status: TransactionStatus;
  /** External reference ID for linking to external systems */
  externalId?: string;
  /** Additional metadata from external systems */
  metadata?: Record<string, unknown>;
  /** User ID (if authenticated) */
  userId?: string;
  /** User wallet address */
  walletAddress?: string;
  /** Source chain ID */
  fromChainId?: number;
  /** Destination chain ID */
  toChainId?: number;
  /** Source token information */
  fromToken?: Token;
  /** Destination token information */
  toToken?: Token;
  /** Amount in source token (raw, in smallest unit) */
  fromAmount?: string;
  /** Expected amount in destination token (raw, in smallest unit) */
  toAmount?: string;
  /** Blockchain transaction hash */
  txHash?: string;
  /** LI.FI explorer URL for the transaction */
  explorerUrl?: string;
  /** LI.FI tool used */
  tool?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Number of status check retries */
  retryCount?: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Completion timestamp */
  completedAt?: string;
}

/**
 * Input for initializing a transaction (server-side only)
 */
export interface InitializeTransactionInput {
  checkoutId: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for adding route data to an initialized transaction
 */
export interface AddRouteDataInput {
  walletAddress: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  tool?: string;
}

// =============================================================================
// User Types
// =============================================================================

/**
 * User wallet record
 */
export interface UserWallet {
  /** Wallet address */
  address: string;
  /** Chain IDs this wallet has been seen on */
  chainIds: number[];
  /** First seen timestamp */
  firstSeen: string;
  /** Last active timestamp */
  lastActive: string;
}

/**
 * User record
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** Associated checkout ID */
  checkoutId: string;
  /** Connected wallets */
  wallets: UserWallet[];
  /** Total transaction count */
  transactionCount: number;
  /** Successful transaction count */
  successfulTransactionCount: number;
  /** Total volume in USD */
  totalVolumeUsd?: string;
  /** First seen timestamp */
  createdAt: string;
  /** Last activity timestamp */
  lastActiveAt: string;
}

// =============================================================================
// Stats Types
// =============================================================================

/**
 * Checkout statistics
 */
export interface Stats {
  /** Total transaction count */
  totalTransactions: number;
  /** Transactions by status */
  transactionsByStatus: Record<TransactionStatus, number>;
  /** Total unique users */
  totalUsers: number;
  /** Total volume in USD */
  totalVolumeUsd?: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Average completion time in seconds */
  avgCompletionTimeSeconds?: number;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * API response wrapper
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
