/**
 * Widget Configuration Types and Defaults
 *
 * Configuration for payment widgets.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const INITIAL_TOKENS_SHOWN = 5;
export const DEFAULT_SLIPPAGE_BUFFER = 0.03;
export const DEFAULT_INTEGRATOR_FEE = 0.01;

export const ANIMATION = {
  transitionDuration: 150,
};

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

// =============================================================================
// THEME TYPES
// =============================================================================

/**
 * Border radius size tokens
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Border radius scale configuration
 */
const BORDER_RADIUS_SCALE: Record<
  BorderRadiusSize,
  { sm: string; md: string; lg: string }
> = {
  xs: { sm: "2px", md: "4px", lg: "6px" },
  sm: { sm: "4px", md: "6px", lg: "10px" },
  md: { sm: "6px", md: "10px", lg: "16px" },
  lg: { sm: "10px", md: "16px", lg: "22px" },
};

/**
 * Widget theme configuration.
 */
export interface WidgetTheme {
  pageBackground?: string;
  background?: string;
  foreground?: string;
  primaryColor?: string;
  primaryHoverColor?: string;
  accentColor?: string;
  rowBackground?: string;
  rowHoverBackground?: string;
  mutedTextColor?: string;
  borderColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  borderRadius?: BorderRadiusSize;
}

// =============================================================================
// CHAIN & SETTLEMENT TYPES
// =============================================================================

export type Chain = "EVM" | "SOL";

/**
 * Settlement chain configuration.
 */
export interface SettlementConfig {
  chain: Chain;
  chainId: number;
  chainName: string;
  tokenAddress: string;
}

/**
 * Default settlement configuration - USDC on Base (EVM)
 */
export const DEFAULT_SETTLEMENT: SettlementConfig = {
  chain: "EVM",
  chainId: 8453,
  chainName: "base",
  tokenAddress: EVM_TOKENS.USDC_BASE,
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

export interface WidgetBranding {
  logo?: string;
  name?: string;
  aiStyleUrl?: string;
  showPoweredBy?: boolean;
}

export interface PaymentPageConfig {
  productImage?: string;
  leftPanelBackground?: string;
  leftPanelTextColor?: string;
  leftPanelMutedColor?: string;
  rightPanelBackground?: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export type WidgetMode = "payment" | "deposit";
export type DepositDestination = "fixed" | "embedded";

export interface WidgetConfig {
  mode: WidgetMode;
  depositDestination?: DepositDestination;
  recipientAddress?: string;
  defaultPaymentAmount?: number;
  depositPresets?: number[];
  minDepositAmount?: number;
  maxDepositAmount?: number;
  settlement?: SettlementConfig;
  slippageBuffer?: number;
  integratorFee?: number;
  ui?: {
    initialTokensShown?: number;
    transitionDuration?: number;
  };
  theme?: WidgetTheme;
  branding?: WidgetBranding;
  paymentPage?: PaymentPageConfig;
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
  slippageBuffer: DEFAULT_SLIPPAGE_BUFFER,
  settlement: DEFAULT_SETTLEMENT,
  integratorFee: DEFAULT_INTEGRATOR_FEE,
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
  partial: Partial<WidgetConfig> = {}
): WidgetConfig {
  return {
    ...DEFAULT_WIDGET_CONFIG,
    ...partial,
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

/**
 * Converts theme config to CSS custom properties
 */
export function themeToCssVars(theme: WidgetTheme): Record<string, string> {
  const merged = { ...DEFAULT_THEME, ...theme };
  const radiusScale = BORDER_RADIUS_SCALE[merged.borderRadius];

  return {
    "--widget-page-bg": merged.pageBackground,
    "--widget-bg": merged.background,
    "--widget-fg": merged.foreground,
    "--widget-primary": merged.primaryColor,
    "--widget-primary-hover": merged.primaryHoverColor,
    "--widget-accent": merged.accentColor,
    "--widget-row-bg": merged.rowBackground,
    "--widget-row-hover": merged.rowHoverBackground,
    "--widget-muted": merged.mutedTextColor,
    "--widget-border": merged.borderColor,
    "--widget-gradient-from": merged.gradientFrom,
    "--widget-gradient-to": merged.gradientTo,
    "--widget-radius-sm": radiusScale.sm,
    "--widget-radius": radiusScale.md,
    "--widget-radius-lg": radiusScale.lg,
  };
}
