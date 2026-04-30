/**
 * Checkout SDK Wrapper
 *
 * SSR-safe wrapper around Dynamic SDK functions for the checkout flow.
 * Uses the real Checkout Transaction API (SDK v0.20+).
 */

import {
  // Auth
  isSignedIn as sdkIsSignedIn,
  // Wallet
  getPrimaryWalletAccount as sdkGetPrimaryWalletAccount,
  getWalletAccounts as sdkGetWalletAccounts,
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  connectWithWalletProvider as sdkConnectWithWalletProvider,
  getWalletProviderDataByKey as sdkGetWalletProviderDataByKey,
  // Balances
  getBalances as sdkGetBalances,
  // Network
  getActiveNetworkData as sdkGetActiveNetworkData,
  getNetworksData as sdkGetNetworksData,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  // Checkout
  createCheckoutTransaction as sdkCreateCheckoutTransaction,
  attachCheckoutTransactionSource as sdkAttachCheckoutTransactionSource,
  getCheckoutTransactionQuote as sdkGetCheckoutTransactionQuote,
  submitCheckoutTransaction as sdkSubmitCheckoutTransaction,
  getCheckoutTransaction as sdkGetCheckoutTransaction,
  cancelCheckoutTransaction as sdkCancelCheckoutTransaction,
  // Types
  type WalletAccount,
  type WalletProviderData,
  type Chain,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
  type CheckoutExecutionState,
  type CheckoutSettlementState,
} from "@dynamic-labs-sdk/client";
import {
  getDefaultClient,
  onEvent as sdkOnEvent,
  offEvent as sdkOffEvent,
  type OnEventParams,
  type OffEventParams,
} from "@dynamic-labs-sdk/client";

// Re-export types
export type {
  WalletAccount,
  WalletProviderData,
  Chain,
  CheckoutTransaction,
  CheckoutTransactionCreateResponse,
  CheckoutExecutionState,
  CheckoutSettlementState,
  OnEventParams,
  OffEventParams,
};

// =============================================================================
// EVENTS
// =============================================================================

export const onEvent: typeof sdkOnEvent = (params) => sdkOnEvent(params);
export const offEvent: typeof sdkOffEvent = (params) => sdkOffEvent(params);

// =============================================================================
// AUTH
// =============================================================================

export const isSignedIn = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return sdkIsSignedIn();
  } catch {
    return false;
  }
};

// =============================================================================
// WALLET
// =============================================================================

export const getPrimaryWalletAccount = (): WalletAccount | null => {
  if (typeof window === "undefined") return null;
  try {
    // Try primary first, fall back to first connected wallet
    const primary = sdkGetPrimaryWalletAccount();
    if (primary) return primary;
    const accounts = sdkGetWalletAccounts();
    return accounts[0] ?? null;
  } catch {
    return null;
  }
};

export const getAvailableWalletProvidersData = (): WalletProviderData[] => {
  if (typeof window === "undefined") return [];
  try {
    return sdkGetAvailableWalletProvidersData() || [];
  } catch {
    return [];
  }
};

export const connectAndVerifyWithWalletProvider = async (params: {
  walletProviderKey: string;
}) => {
  if (typeof window === "undefined") throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletProvider(params);
};

export const connectWithWalletProvider = async (params: {
  walletProviderKey: string;
}) => {
  if (typeof window === "undefined") throw new Error("Dynamic client not initialized");
  return sdkConnectWithWalletProvider(params);
};

export function getWalletDisplayName(wallet: WalletAccount): string {
  try {
    const provider = sdkGetWalletProviderDataByKey({
      walletProviderKey: wallet.walletProviderKey,
    });
    return provider?.metadata.displayName ?? "your wallet";
  } catch {
    return "your wallet";
  }
}

// =============================================================================
// BALANCES
// =============================================================================

export const getBalances = async (params: {
  walletAccount: WalletAccount;
  includeNative?: boolean;
  includePrices?: boolean;
  filterSpamTokens?: boolean;
}) => {
  if (typeof window === "undefined") return [];
  return sdkGetBalances(params);
};

// =============================================================================
// NETWORK
// =============================================================================

export const getActiveNetworkData = async (params: {
  walletAccount: WalletAccount;
}) => {
  return sdkGetActiveNetworkData(params);
};

export const getNetworksData = () => {
  if (typeof window === "undefined") return [];
  try {
    return sdkGetNetworksData() || [];
  } catch {
    return [];
  }
};

export const switchActiveNetwork = async (params: {
  walletAccount: WalletAccount;
  networkId: string;
}) => {
  return sdkSwitchActiveNetwork(params);
};

// =============================================================================
// CHECKOUT TRANSACTION API
// =============================================================================

export const createCheckoutTransaction = async (params: {
  amount: string;
  currency: string;
  checkoutId?: string;
  memo?: object;
}): Promise<CheckoutTransactionCreateResponse> => {
  return sdkCreateCheckoutTransaction(params);
};

export const attachCheckoutTransactionSource = async (params: {
  transactionId: string;
  fromAddress: string;
  fromChainId: string;
  fromChainName: Chain;
}): Promise<CheckoutTransaction> => {
  return sdkAttachCheckoutTransactionSource(params);
};

export const getCheckoutTransactionQuote = async (params: {
  transactionId: string;
  fromTokenAddress: string;
  slippage?: number;
}): Promise<CheckoutTransaction> => {
  return sdkGetCheckoutTransactionQuote(params);
};

export const submitCheckoutTransaction = async (params: {
  transactionId: string;
  walletAccount: WalletAccount;
  onStepChange?: (step: "approval" | "transaction") => void;
}): Promise<CheckoutTransaction> => {
  return sdkSubmitCheckoutTransaction(params);
};

export const getCheckoutTransaction = async (params: {
  transactionId: string;
}): Promise<CheckoutTransaction> => {
  return sdkGetCheckoutTransaction(params);
};

export const cancelCheckoutTransaction = async (params: {
  transactionId: string;
}): Promise<CheckoutTransaction> => {
  return sdkCancelCheckoutTransaction(params);
};

// =============================================================================
// STATUS HELPERS
// =============================================================================

const TERMINAL_EXECUTION_STATES: CheckoutExecutionState[] = [
  "cancelled",
  "expired",
  "failed",
];
const TERMINAL_SETTLEMENT_STATES: CheckoutSettlementState[] = [
  "completed",
  "failed",
];

export function isTerminalState(tx: CheckoutTransaction): boolean {
  // Standard terminal states
  if (
    TERMINAL_EXECUTION_STATES.includes(
      tx.executionState as CheckoutExecutionState,
    ) ||
    TERMINAL_SETTLEMENT_STATES.includes(
      tx.settlementState as CheckoutSettlementState,
    )
  ) {
    return true;
  }

  // Direct transfer (no swap/bridge): source_confirmed + no settlement = done
  if (
    tx.executionState === "source_confirmed" &&
    tx.settlementState === "none"
  ) {
    return true;
  }

  return false;
}

export function isSuccessState(tx: CheckoutTransaction): boolean {
  return (
    tx.settlementState === "completed" ||
    // Direct transfer: source confirmed with no settlement needed
    (tx.executionState === "source_confirmed" && tx.settlementState === "none")
  );
}

export function isFailedState(tx: CheckoutTransaction): boolean {
  return tx.executionState === "failed" || tx.settlementState === "failed";
}
