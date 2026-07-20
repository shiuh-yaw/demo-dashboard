/**
 * Dashboard Types
 *
 * Types for the demo dashboard configurations.
 */

import { TransactionState } from "@dynamic-demos/transactions";
import type { WidgetTheme } from "@dynamic-demos/theme";

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
 * Supported logo/prospect types
 * "custom" allows passing a hosted SVG URL via logoUrl
 */
export type EarnBrand = "dynamic" | "youtube" | "meta" | "remitly" | "custom";

/**
 * Border radius size tokens
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Theme configuration for Earn demo — the canonical `WidgetTheme`
 * shape (D-008). Aliased so callsites can keep the demo-scoped name.
 * Earn-era prospect data was stored with `backgroundLightColor` as the
 * surface variant; that legacy key is retained as an optional alias
 * for `WidgetTheme.background` so existing stored configs continue to
 * theme correctly.
 */
export type EarnTheme = Partial<WidgetTheme> & {
  /** Legacy alias for `WidgetTheme.background` — the widget/card surface. */
  backgroundLightColor?: string;
};

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
 * Default theme for Earn Dashboard. Earn's design language (Google-ish
 * blue accent on a near-white surface) baked in as a fallback when no
 * per-prospect theme is set.
 */
export const DEFAULT_EARN_THEME: EarnTheme = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  backgroundColor: "#F9F9F9",
  backgroundLightColor: "#FFFFFF",
  foregroundColor: "#030303",
  mutedTextColor: "#606060",
  borderColor: "#DADADA",
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
 * Remittance theme — the canonical `WidgetTheme` shape (D-008).
 * Aliased so callsites can keep the demo-scoped name; downstream the
 * remittance app projects this onto `Partial<ProspectTheme>` for SSR
 * injection via `<ThemeStyleTag>`, the same pipeline every other
 * themed demo uses.
 *
 * Retains `secondaryColor` as a legacy companion to `primaryColor` —
 * the remittance editor / projector use it to drive the card gradient
 * when no explicit `gradientFrom`/`gradientTo` is set.
 */
export type RemittanceTheme = Partial<WidgetTheme> & {
  /** Optional secondary prospect color — drives card gradient when set. */
  secondaryColor?: string;
};

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
 * Default theme for Remittance. Only the prospect-defining colors are
 * pinned; everything else is left undefined so it falls through to
 * `@dynamic-demos/theme/defaults.css` at runtime.
 */
export const DEFAULT_REMITTANCE_THEME: RemittanceTheme = {
  primaryColor: "#1a56db",
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
// Trade Configuration (Branding)
// =============================================================================

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
  branding?: TradeBranding;
}

/**
 * Default Trade configuration
 */
export const DEFAULT_TRADE_CONFIG: TradeConfig = {
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
// Visa Direct Configuration (Branding + Theme)
// =============================================================================

/**
 * Visa Direct branding
 * Matches apps/visa-direct/lib/visa-direct-config.ts VisaDirectBranding
 */
export interface VisaDirectBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic wordmark. */
  logoUrl?: string;
  /** Top demo banner text. When empty, the banner is hidden. */
  bannerText?: string;
}

/**
 * Visa Direct theme — the canonical `WidgetTheme` shape (D-008).
 * Aliased so callsites keep the demo-scoped name. By design Visa Direct
 * only consumes `primaryColor` (its surfaces/text stay neutral across
 * prospects), but the type matches every other themed demo so prospect-side
 * data flows through unchanged.
 */
export type VisaDirectTheme = Partial<WidgetTheme>;

/**
 * Full Visa Direct configuration
 */
export interface VisaDirectConfig {
  branding: VisaDirectBranding;
  theme: VisaDirectTheme;
}

/**
 * Default Visa Direct configuration.
 * Dynamic-branded, neutral slate palette — so an unbranded demo = Dynamic.
 */
export const DEFAULT_VISA_DIRECT_CONFIG: VisaDirectConfig = {
  branding: {
    bannerText: "Demo environment — Visa Direct × Fireblocks",
  },
  theme: {
    primaryColor: "#4779FF",
  },
};

/**
 * Stored Visa Direct configuration with metadata
 */
export interface StoredVisaDirectConfig {
  id: string;
  name: string;
  description?: string;
  config: VisaDirectConfig;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

// =============================================================================
// Prospect Profiles
// =============================================================================

/**
 * Extended theme settings for prospect profiles
 * Captures full color palette from AI import, applied to demo configs
 */
export interface ProspectTheme {
  /** Primary prospect color */
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
 * Shared prospect settings applied across all demo types
 */
export interface ProspectSettings {
  /** Logo type - "custom" for uploaded/external, "dynamic" for default */
  logo: "custom" | "dynamic";
  /** URL to custom logo (when logo is "custom") */
  logoUrl?: string;
  /** Primary prospect color (convenience accessor, also in theme) */
  primaryColor: string;
  /** Accent color for highlights (convenience accessor, also in theme) */
  accentColor?: string;
  /** Border radius size (convenience accessor, also in theme) */
  borderRadius?: BorderRadiusSize;
  /** Full theme settings (captured from AI import) */
  theme?: ProspectTheme;
}

/**
 * Demo config references - IDs of auto-generated configs
 */
export interface ProspectDemos {
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
 * Prospect Profile - unified branding across all demo types
 *
 * A prospect profile owns shared branding settings that are applied
 * to auto-generated demo configs (Earn, Checkouts, Wallet).
 */
export interface ProspectProfile {
  /** Unique identifier */
  id: string;
  /** Display name (e.g., "Acme Corp Demo") */
  name: string;
  /** Company website URL (for auto-extracting prospect colors) */
  companyUrl?: string;
  /** Shared prospect settings */
  prospect: ProspectSettings;
  /** Auto-generated demo config IDs */
  demos: ProspectDemos;
  /** Owner ID who created this profile */
  ownerId?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Default prospect theme (full color palette)
 */
export const DEFAULT_PROSPECT_THEME: ProspectTheme = {
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
 * Default prospect settings
 */
export const DEFAULT_PROSPECT_SETTINGS: ProspectSettings = {
  logo: "dynamic",
  primaryColor: "#4779FF",
  accentColor: "#1967D2",
  borderRadius: "md",
  theme: DEFAULT_PROSPECT_THEME,
};

/**
 * Request to create a new prospect profile
 */
export interface CreateProspectProfileRequest {
  name: string;
  companyUrl?: string;
  prospect?: Partial<ProspectSettings>;
  /** Which demos to generate (defaults to all) */
  generateDemos?: {
    earn?: boolean;
    checkouts?: boolean;
    wallet?: boolean;
    remittance?: boolean;
  };
}

/**
 * Request to update a prospect profile
 */
export interface UpdateProspectProfileRequest {
  name?: string;
  companyUrl?: string;
  prospect?: Partial<ProspectSettings>;
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
 * Transaction status constants (back-compat alias).
 *
 * Canonical state values now live in `@dynamic-demos/transactions`
 * (`TransactionState`); this map only preserves the dashboard's
 * historical UPPERCASE_KEY shape so existing call-sites keep working
 * (e.g. `Status.INITIALIZED`). New code should import
 * `TransactionState` directly from `@dynamic-demos/transactions`.
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
 *
 * @see DECISIONS.md D-010
 */
export const Status = {
  INITIALIZED: TransactionState.initialized,
  DRAFT: TransactionState.draft,
  SUBMITTED: TransactionState.submitted,
  PENDING: TransactionState.pending,
  CONFIRMED: TransactionState.confirmed,
  FAILED: TransactionState.failed,
  CANCELLED: TransactionState.cancelled,
  EXPIRED: TransactionState.expired,
  ABANDONED: TransactionState.abandoned,
} as const;

/**
 * Transaction status type — back-compat alias for the canonical
 * `TransactionState`. Prefer `TransactionState` in new code.
 */
export type TransactionStatus = TransactionState;

// Re-export the canonical state machine types for callers that prefer
// the new naming. Existing imports of `Status` / `TransactionStatus`
// from this module continue to work.
export { TransactionState } from "@dynamic-demos/transactions";

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

// =============================================================================
// Flow Configuration (Dynamic Flow / Checkouts / Deposit-with-Crypto)
// =============================================================================

/**
 * Flow scenario discriminator. Each scenario is a prebuilt demo flow
 * in `apps/flow` with a curated default `source` + `destination`. The
 * builder lets the user override either toggle live; this field marks
 * the demo's intended top-level pitch.
 */
export type FlowScenario = "checkout" | "deposit" | "withdraw";

/**
 * Where funds originate. Maps to the Flow SDK's source-attachment
 * surface (`attachCheckoutTransactionSource`). The `details` payload
 * is preserved as a hint for the UI; the SDK still allows the user to
 * pick from any connected provider at runtime.
 */
export type FlowSourceType =
  | "external-wallet"
  | "exchange"
  | "embedded-wallet"
  | "fireblocks-vault";

export interface FlowSource {
  type: FlowSourceType;
  /** Optional UI hint for which wallet/exchange to surface first. */
  preferred?: {
    walletProvider?: string;
    exchange?: "coinbase" | "kraken" | "crypto-com";
  };
}

/**
 * Where funds settle. Mirrors the Flow checkout config's destination
 * field. `fireblocks-vault` requires a vault account id (server-side
 * only — the public config carries it for display, but the secret
 * Fireblocks creds live in `apps/flow`'s env per D-003).
 */
export type FlowDestinationType =
  | "fireblocks-vault"
  | "embedded-wallet"
  | "external-address";

export interface FlowDestination {
  type: FlowDestinationType;
  /** Vault account id when type === "fireblocks-vault". */
  vaultAccountId?: string;
  /** Static address when type === "external-address". */
  address?: string;
}

/**
 * Settlement asset (the stablecoin or token the merchant/platform
 * wants to receive). Chain identifier follows the Flow SDK's `Chain`
 * type (lower-case ecosystem slug).
 */
export interface FlowAsset {
  symbol: string;
  chain: string;
}

export interface FlowAmountConfig {
  /**
   * `"fixed"` — merchant sets the amount (Payment mode).
   * `"user-input"` — end-user sets the amount (Deposit mode, with
   * optional minimums + preset chips).
   */
  mode: "fixed" | "user-input";
  fixedAmount?: string;
  fixedCurrency?: string;
  minimums?: { usd?: number };
  presets?: number[];
}

export interface FlowCompliance {
  sanctionsScreening: boolean;
  spamTokenFilter: boolean;
  geographicBlocks?: string[];
}

export interface FlowBranding {
  logoUrl?: string;
  appName?: string;
}

export interface FlowTheme {
  primaryColor?: string;
  primaryHoverColor?: string;
  accentColor?: string;
}

/**
 * Full Flow configuration. Stored as `DemoConfig.config` with
 * `kind === "flow"`. The Zod schema lives at
 * `apps/flow/lib/flow-config/schema.ts` and is referenced by the
 * Anthropic system prompt so chat-to-create stays in shape.
 */
export interface FlowConfig {
  scenario: FlowScenario;
  source: FlowSource;
  destination: FlowDestination;
  asset: FlowAsset;
  amount: FlowAmountConfig;
  compliance: FlowCompliance;
  theme?: FlowTheme;
  branding?: FlowBranding;
}

/**
 * Default theme for Flow. Dynamic blue is the canonical primary;
 * everything else falls through to prospect chrome defaults at runtime.
 */
export const DEFAULT_FLOW_THEME: FlowTheme = {
  primaryColor: "#4779FF",
};

/**
 * Default Flow configuration — used when a scenario route has no
 * config id resolved (no `?id=`, no cookie). Maps to the Checkout
 * scenario by default; the landing surfaces all three.
 */
export const DEFAULT_FLOW_CONFIG: FlowConfig = {
  scenario: "checkout",
  source: { type: "external-wallet" },
  destination: { type: "fireblocks-vault" },
  asset: { symbol: "USDC", chain: "base" },
  amount: { mode: "fixed", fixedAmount: "5.00", fixedCurrency: "USD" },
  compliance: { sanctionsScreening: true, spamTokenFilter: true },
  theme: DEFAULT_FLOW_THEME,
  branding: {},
};

/**
 * Stored Flow configuration with metadata. Returned by the dashboard's
 * `/api/orchestrate/demo-configs` (or per-kind) endpoints and consumed
 * by `apps/flow`'s server layout to render the active scenario.
 */
export interface StoredFlowConfig {
  id: string;
  name: string;
  description?: string;
  config: FlowConfig;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}
