/**
 * Widget Configuration Types and Defaults
 *
 * Configuration is split into two parts:
 * 1. WidgetConfig - Static settings configured once (from server or environment)
 * 2. TransactionConfig - Per-session values that change with each payment/deposit
 */

import { ANIMATION, INITIAL_TOKENS_SHOWN } from "./config";

import type { Chain } from "@/lib/dynamicClient";

/** Common Solana token addresses */
export const SOLANA_TOKENS = {
  /** USDC on Solana (Circle native) */
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  /** Native SOL (represented as this for LI.FI) */
  SOL: "11111111111111111111111111111111",
} as const;

/** Common EVM token addresses */
export const EVM_TOKENS = {
  /** USDC on Base mainnet */
  USDC_BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const;

/** Default recipient addresses */
export const RECIPIENT_ADDRESSES = {
  /** Default EVM deposit address */
  DEFAULT_EVM_DEPOSIT: "0x5C260969b90152a46D52BC476C94524C8E796b3d",
  /** Default payment recipient address */
  DEFAULT_PAYMENT: "0x9C040E69a7e1866717E0A7a09D3484C718A1e8E7",
} as const;

/** LI.FI chain ID for Solana mainnet */
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710;

/** Dynamic SDK network ID for Solana mainnet */
export const DYNAMIC_SOLANA_NETWORK_ID = 101;

// =============================================================================
// THEME TYPES
// =============================================================================

/**
 * Border radius size tokens
 * - xs: 4px base, 6px container (sharp/minimal)
 * - sm: 6px base, 10px container (compact)
 * - md: 10px base, 16px container (default)
 * - lg: 16px base, 22px container (rounded)
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Widget theme configuration.
 * All colors should be valid CSS color values (hex, rgb, hsl, etc.)
 */
export interface WidgetTheme {
  /** Page/container background color */
  pageBackground?: string;
  /** Widget card background color */
  background?: string;
  /** Primary text color */
  foreground?: string;
  /** Primary button background color */
  primaryColor?: string;
  /** Primary button hover color */
  primaryHoverColor?: string;
  /** Accent color for highlights, links, loading states */
  accentColor?: string;
  /** Row/card background color */
  rowBackground?: string;
  /** Row hover background color */
  rowHoverBackground?: string;
  /** Muted/secondary text color */
  mutedTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Gradient start color (for token cards) */
  gradientFrom?: string;
  /** Gradient end color (for token cards) */
  gradientTo?: string;
  /** Border radius size: "sm" (compact), "md" (default), "lg" (rounded) */
  borderRadius?: BorderRadiusSize;
}

// =============================================================================
// CHAIN & SETTLEMENT TYPES
// =============================================================================

/**
 * Settlement chain configuration.
 * Defines where swapped tokens are sent.
 */
export interface SettlementConfig {
  /** Chain type: "EVM" or "SOL" */
  chain: Chain;
  /** Chain ID (LI.FI uses 1151111081099710 for Solana) */
  chainId: number;
  /** Chain name for display */
  chainName: string;
  /** Token address (contract address for EVM, mint address for Solana) */
  tokenAddress: string;
  /** Token symbol (e.g., "USDC", "SOL") — used for matching exchange currencies */
  tokenSymbol?: string;
  /** Token decimals (e.g., 6 for USDC) */
  decimals: number;
}

/**
 * Map Dynamic SDK network IDs to LI.FI chain IDs.
 * Dynamic uses standard cluster IDs for Solana (101 = mainnet),
 * while LI.FI uses a different internal ID system.
 *
 * @param networkId - Dynamic SDK network ID
 * @returns LI.FI-compatible chain ID
 */
export function toLiFiChainId(networkId: number): number {
  // Solana mainnet: Dynamic uses 101, LI.FI uses 1151111081099710
  if (networkId === DYNAMIC_SOLANA_NETWORK_ID) return LIFI_SOLANA_CHAIN_ID;
  // EVM chain IDs are the same in both systems
  return networkId;
}

/**
 * Map LI.FI chain IDs back to Dynamic SDK network IDs.
 *
 * @param chainId - LI.FI chain ID
 * @returns Dynamic SDK-compatible network ID
 */
export function toDynamicNetworkId(chainId: number): number {
  if (chainId === LIFI_SOLANA_CHAIN_ID) return DYNAMIC_SOLANA_NETWORK_ID;
  return chainId;
}

/**
 * Check if a chain ID represents Solana (in either system).
 */
export function isSolanaChainId(chainId: number): boolean {
  return (
    chainId === LIFI_SOLANA_CHAIN_ID || chainId === DYNAMIC_SOLANA_NETWORK_ID
  );
}

/**
 * Default settlement configuration - USDC on Base (EVM)
 */
export const DEFAULT_SETTLEMENT: SettlementConfig = {
  chain: "EVM",
  chainId: 8453, // Base mainnet
  chainName: "base",
  tokenAddress: EVM_TOKENS.USDC_BASE,
  tokenSymbol: "USDC",
  decimals: 6,
};

/**
 * Solana settlement configuration - USDC on Solana
 * Use this for EVM → Solana or Solana → Solana deposits.
 */
export const SOLANA_SETTLEMENT: SettlementConfig = {
  chain: "SOL",
  chainId: LIFI_SOLANA_CHAIN_ID,
  chainName: "solana",
  tokenAddress: SOLANA_TOKENS.USDC,
  tokenSymbol: "USDC",
  decimals: 6,
};

/**
 * Default theme values
 */
export const DEFAULT_THEME: Required<WidgetTheme> = {
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

// =============================================================================
// BRANDING TYPES
// =============================================================================

/**
 * Widget branding configuration
 */
export interface WidgetBranding {
  /** Brand logo URL (displayed in header) */
  logo?: string;
  /** Brand name (used for alt text and fallback) */
  name?: string;
  /** Show "Powered by Dynamic" footer watermark (default: true) */
  showPoweredBy?: boolean;
}

/**
 * Payment page layout configuration
 * Used for split-screen payment page layout in payment mode
 */
export interface PaymentPageConfig {
  /** Product image URL to display on the payment page */
  productImage?: string;
  /** Background color for the left panel (default: #151515) */
  leftPanelBackground?: string;
  /** Text color for the left panel (default: #ffffff) */
  leftPanelTextColor?: string;
  /** Muted text color for the left panel (default: #8e8e8e) */
  leftPanelMutedColor?: string;
  /** Background color for the right panel (default: #f8f8f8) */
  rightPanelBackground?: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/** Widget mode determines the payment flow */
export type WidgetMode = "payment" | "deposit";

/**
 * Deposit destination determines where funds are sent.
 *
 * - **"fixed"**: Funds go to the merchant's `recipientAddress`
 * - **"embedded"**: Funds go to the user's Dynamic embedded wallet
 *
 * When `"embedded"` is selected:
 * - The widget creates/retrieves the user's embedded wallet automatically
 * - A navigation pill appears to switch between Deposit and Wallet views
 * - The EmbeddedWalletWidget is accessible at `/wallet`
 */
export type DepositDestination = "fixed" | "embedded";

/**
 * Static widget configuration.
 * These settings are typically configured once and don't change per transaction.
 * Can be fetched from a server endpoint or set in environment config.
 */
export interface WidgetConfig {
  /** Widget mode: "payment" (fixed amount) or "deposit" (user enters amount) */
  mode: WidgetMode;

  /** Deposit destination: "fixed" (merchant address) or "embedded" (user's Dynamic wallet) */
  depositDestination?: DepositDestination;

  /**
   * Recipient address where deposits/payments are sent.
   * Format must match the settlement chain type:
   * - EVM settlement: Use EVM address (0x...)
   * - SOL settlement: Use Solana address (base58)
   */
  recipientAddress?: string;

  /** Payment mode: Default payment amount in USD */
  defaultPaymentAmount?: number;

  /** Deposit mode: Preset amounts for quick selection */
  depositPresets?: number[];

  /** Deposit mode: Minimum deposit amount */
  minDepositAmount?: number;

  /** Deposit mode: Maximum deposit amount (optional) */
  maxDepositAmount?: number;

  /** Settlement configuration - where swapped tokens are sent */
  settlement?: SettlementConfig;

  /** UI Configuration */
  ui?: {
    /** Number of tokens to show before "Show more" */
    initialTokensShown?: number;
    /** Animation duration in milliseconds */
    transitionDuration?: number;
  };

  /** Theme customization */
  theme?: WidgetTheme;

  /** Branding customization */
  branding?: WidgetBranding;

  /** Payment page layout configuration (payment mode only) */
  paymentPage?: PaymentPageConfig;
}

/**
 * Per-transaction configuration.
 * These values change with each payment session and are provided by the parent component.
 */
export interface TransactionConfig {
  /**
   * Payment mode: The amount to pay in USD.
   * Required for payment mode, ignored for deposit mode.
   */
  paymentAmount?: number;

  /**
   * External ID for linking this transaction to an external system.
   * Captured from URL params server-side for security.
   */
  externalId?: string;

  /**
   * Additional metadata to attach to the transaction.
   * Captured from URL params server-side for security.
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  mode: "deposit",
  recipientAddress: RECIPIENT_ADDRESSES.DEFAULT_EVM_DEPOSIT,
  depositPresets: [5, 10, 50, 100],
  minDepositAmount: 1,
  maxDepositAmount: 1000,
  settlement: DEFAULT_SETTLEMENT,
  ui: {
    initialTokensShown: INITIAL_TOKENS_SHOWN,
    transitionDuration: ANIMATION.transitionDuration,
  },
};

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Merges partial widget config with defaults
 */
export function createWidgetConfig(
  partial: Partial<WidgetConfig> = {},
): WidgetConfig {
  return {
    ...DEFAULT_WIDGET_CONFIG,
    ...partial,
    settlement: {
      ...DEFAULT_SETTLEMENT,
      ...partial.settlement,
    },
    ui: {
      ...DEFAULT_WIDGET_CONFIG.ui,
      ...partial.ui,
    },
    theme: {
      ...DEFAULT_THEME,
      ...partial.theme,
    },
  };
}

// Legacy `themeToCssVars` removed in Phase 4 — theme tokens are now injected
// at the document level via `<ThemeStyleTag>` in `app/layout.tsx` using the
// `--brand-*` token contract (D-007/D-008). The `themeToBrandTheme` helper
// in `lib/checkouts-brand.ts` projects the dashboard's stored `WidgetTheme`
// onto a `Partial<BrandTheme>` overlay consumed by `<ThemeStyleTag
// overridesOnly>`.

// =============================================================================
// SWAP CALCULATION HELPERS
// =============================================================================

/**
 * Converts a USD amount to the raw settlement token amount.
 * Settlement tokens are USD-denominated stablecoins (e.g., USDC),
 * so 1 USD = 1 token.
 *
 * @param amountUsd - The payment/deposit amount in USD
 * @param decimals - Settlement token decimals (e.g., 6 for USDC)
 * @returns Raw amount in smallest unit (e.g., 10_000_000 for $10 USDC)
 */
export function toRawSettlementAmount(
  amountUsd: number,
  decimals: number,
): string {
  const raw = amountUsd * Math.pow(10, decimals);
  if (!Number.isFinite(raw) || raw <= 0) {
    return "0";
  }
  return BigInt(Math.ceil(raw)).toString();
}

// =============================================================================
// EXAMPLE STATIC CONFIGS
// =============================================================================

/**
 * These would normally be fetched from your server.
 * The implementing application provides these configs to PaymentWidget.
 *
 * Example server endpoint: GET /api/widget-config
 */

/**
 * Deposit mode: User enters their own amount to deposit
 * Settles to USDC on Base
 */
export const DEPOSIT_CONFIG: WidgetConfig = {
  mode: "deposit",
  recipientAddress: RECIPIENT_ADDRESSES.DEFAULT_EVM_DEPOSIT,
  depositPresets: [5, 50, 100, 500],
  minDepositAmount: 0.01,
  maxDepositAmount: 1000,
  settlement: DEFAULT_SETTLEMENT,
  ui: {
    initialTokensShown: INITIAL_TOKENS_SHOWN,
    transitionDuration: ANIMATION.transitionDuration,
  },
};

/**
 * Payment mode: Fixed amount for purchasing an item
 * Settles to USDC on Base
 *
 * Note: paymentAmount is NOT included here - it comes from TransactionConfig
 */
export const PAYMENT_CONFIG: WidgetConfig = {
  mode: "payment",
  recipientAddress: RECIPIENT_ADDRESSES.DEFAULT_PAYMENT,
  settlement: DEFAULT_SETTLEMENT,
  ui: {
    initialTokensShown: INITIAL_TOKENS_SHOWN,
    transitionDuration: ANIMATION.transitionDuration,
  },
};
