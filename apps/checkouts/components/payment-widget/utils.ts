/**
 * Payment Widget Utilities
 *
 * Types, constants, and helper functions for the payment widget.
 * Extracted to keep the main component focused on rendering logic.
 *
 * @module components/payment-widget/utils
 */

import type { ReviewQuote } from "@/lib/types";
import type { TokenInfo, TransactionStep } from "@dynamic-demos/checkouts-widget";
import type { TokenAsset } from "@/lib/balance-utils";
import type { WalletGroup } from "@/components/connect-wallet-screen";
import { NATIVE_TOKEN_ADDRESS } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { Status, type TransactionStatus } from "@/lib/types";

// =============================================================================
// TRANSACTION STATUS CONSTANTS
// =============================================================================
//
// CANCELLABLE_STATUSES = user can cancel the transaction (e.g. go back, close).
// IMMUTABLE_QUOTE_STATUSES = transaction in progress or final; no new quote allowed.
// These sets are related but not strictly complementary (e.g. CANCELLED is in neither).
//

/**
 * Transaction statuses that allow cancellation.
 * Once a transaction is submitted to the blockchain, it cannot be cancelled.
 */
export const CANCELLABLE_STATUSES: TransactionStatus[] = [
  Status.INITIALIZED,
  Status.DRAFT,
  Status.FAILED,
];

/** Check if a transaction status allows cancellation */
export function isCancellableStatus(status: TransactionStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}


// =============================================================================
// SCREEN TYPES
// =============================================================================

/** All possible screen states in the payment widget */
export type Screen =
  | { type: "deposit-amount" }
  | { type: "connect"; amount: number }
  | { type: "connect-chain"; wallet: WalletGroup; amount: number }
  | { type: "assets"; amount: number }
  | { type: "review"; amount: number; token: TokenAsset }
  | {
      type: "processing";
      amount: number;
      token: TokenAsset;
      steps: TransactionStep[];
      explorerLink?: string;
    }
  | {
      type: "completed";
      transactionId: string;
      explorerUrl?: string;
    }
  | {
      type: "pending";
      transactionId: string;
      explorerUrl?: string;
    }
  | { type: "connected-wallets"; amount: number }
  | { type: "add-wallet"; amount: number }
  | { type: "add-wallet-chain"; wallet: WalletGroup; amount: number }
  | { type: "exchange-whitelisting"; walletAddress: string; amount: number }
  | { type: "exchange-connecting"; amount: number };

/** Screen type strings */
export type ScreenType = Screen["type"];

/** Screens that require login (will redirect to connect if logged out) */
export const PROTECTED_SCREENS: ScreenType[] = [
  "assets",
  "review",
  "processing",
  "completed",
  "connected-wallets",
  "add-wallet",
  "add-wallet-chain",
  "exchange-whitelisting",
];

/** Check if a screen type requires authentication */
export function isProtectedScreen(screenType: ScreenType): boolean {
  return PROTECTED_SCREENS.includes(screenType);
}

/** Check if a screen should reset state when navigated to */
export function shouldResetOnScreen(screenType: ScreenType): boolean {
  return screenType === "assets" || screenType === "connect";
}

// =============================================================================
// TOKEN HELPERS
// =============================================================================

/**
 * Check if a token needs conversion to settlement token.
 */
export function needsTokenConversion(
  token: TokenAsset,
  settlement?: { tokenAddress: string },
): boolean {
  if (!settlement || !token.tokenAddress) return false;
  return (
    settlement.tokenAddress.toLowerCase() !== token.tokenAddress.toLowerCase()
  );
}

/**
 * Get the token address for API calls.
 * Uses native token address as fallback for native tokens (ETH, etc.)
 */
export function getTokenAddress(token: TokenAsset): string {
  return token.tokenAddress || NATIVE_TOKEN_ADDRESS;
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Build source token display info for review/processing screens.
 * Prefers the balance-loader's iconUrl (CoinGecko-backed, generally
 * allowlist-friendly). Falls back to the Checkout Flow quote's logoURI
 * (Trust Wallet CDN, which some adblockers / corporate networks block)
 * only when the balance loader didn't carry an icon.
 */
export function buildSourceTokenInfo(
  token: TokenAsset,
  amount: string,
  usdValue: string,
  quote?: ReviewQuote | null,
): TokenInfo {
  return {
    name: token.name,
    symbol: token.symbol,
    amount,
    usdValue,
    iconUrl: token.iconUrl ?? quote?.fromToken.logoURI,
  };
}

/**
 * Build destination token display info from quote.
 */
export function buildDestinationTokenInfo(quote: ReviewQuote): TokenInfo {
  return {
    name: quote.toToken.name ?? quote.toToken.symbol,
    symbol: quote.toToken.symbol,
    amount: parseFloat(quote.toAmount).toFixed(2),
    usdValue: formatUsd(parseFloat(quote.toAmountUsd)),
    iconUrl: quote.toToken.logoURI,
  };
}

/**
 * Calculate source amount for display.
 */
export function getSourceAmount(
  quote: ReviewQuote | null,
  isSameToken: boolean,
  paymentAmount: number,
): string {
  if (quote?.fromAmount) return quote.fromAmount;
  if (isSameToken) return paymentAmount.toFixed(2);
  return "—";
}

/**
 * Calculate fee breakdown for display.
 */
export function calculateFeeBreakdown(
  paymentAmount: number,
  quote: ReviewQuote | null,
  isSameToken: boolean,
): {
  feeUsd: number;
  totalUsd: number;
  sourceAmount: string;
  sourceAmountNum: number;
  itemTotalToken: number;
  feeToken: number;
} {
  const feeUsd = isSameToken ? 0 : parseFloat(quote?.totalFeeUsd || "0.01");
  const totalUsd = paymentAmount + feeUsd;
  const sourceAmount = getSourceAmount(quote, isSameToken, paymentAmount);
  const sourceAmountNum = parseFloat(sourceAmount) || 0;

  const itemTotalToken = isSameToken
    ? sourceAmountNum
    : sourceAmountNum > 0
      ? (sourceAmountNum * paymentAmount) / totalUsd
      : 0;

  const feeToken = isSameToken
    ? 0
    : sourceAmountNum > 0
      ? (sourceAmountNum * feeUsd) / totalUsd
      : 0;

  return {
    feeUsd,
    totalUsd,
    sourceAmount,
    sourceAmountNum,
    itemTotalToken,
    feeToken,
  };
}

// =============================================================================
// HEADER CONFIGURATION
// =============================================================================

export interface HeaderConfig {
  title: string;
  subtitle: string;
  onBack?: () => void;
  onClose?: () => void;
}

interface GetHeaderConfigOptions {
  screen: Screen;
  mode: "deposit" | "payment";
  walletConnectCancel: (() => void) | null;
  goToDepositAmount: () => void;
  goToConnect: () => void;
  goToConnectedWallets: () => void;
  goToAddWallet: () => void;
  goToAssets: () => void;
}

/**
 * Get header configuration for the current screen.
 * Returns null for screens that don't have a header (assets, review, processing).
 */
export function getHeaderConfig(
  options: GetHeaderConfigOptions,
): HeaderConfig | null {
  const {
    screen,
    mode,
    walletConnectCancel,
    goToDepositAmount,
    goToConnect,
    goToConnectedWallets,
    goToAddWallet,
    goToAssets,
  } = options;

  switch (screen.type) {
    case "connect":
      return {
        title: "Connect Wallet or Exchange",
        subtitle: "Choose how you would like to pay",
        onBack: walletConnectCancel
          ? walletConnectCancel
          : mode === "deposit"
            ? goToDepositAmount
            : undefined,
      };

    case "connect-chain":
      return {
        title: "Select Network",
        subtitle: `Connect with ${screen.wallet.displayName}`,
        onBack: () => goToConnect(),
      };

    case "connected-wallets":
      return {
        title: "Your Wallets",
        subtitle: "Select a wallet or connect a new one",
        onClose: () => goToAssets(),
      };

    case "add-wallet":
      return {
        title: "Connect Wallet or Exchange",
        subtitle: "Choose how you would like to pay",
        onBack: walletConnectCancel
          ? walletConnectCancel
          : goToConnectedWallets,
        onClose: () => goToAssets(),
      };

    case "add-wallet-chain":
      return {
        title: "Select Network",
        subtitle: `Connect with ${screen.wallet.displayName}`,
        onBack: goToAddWallet,
        onClose: () => goToAssets(),
      };

    case "exchange-whitelisting":
      return {
        title: "",
        subtitle: "",
        onClose: () => goToAssets(),
      };

    default:
      return null;
  }
}
