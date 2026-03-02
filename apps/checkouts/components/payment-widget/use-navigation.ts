"use client";

/**
 * Widget Navigation Hook
 *
 * Manages screen state, transitions, and auth-reactive navigation
 * for the payment widget. Encapsulates navigation logic to keep
 * the main component focused on rendering.
 *
 * @module components/payment-widget/use-navigation
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  type Screen,
  type ScreenType,
  isProtectedScreen,
  shouldResetOnScreen,
} from "./utils";
import type { WalletGroup } from "@/components/connect-wallet-screen";
import type { TokenAsset } from "@/lib/balance-utils";
import type { TransactionStep } from "@/components/payment-modal/transaction-progress-screen";
import { updateTransactionSteps } from "@/components/payment-modal/transaction-progress-screen";
import type { ExecutionUpdate } from "@/hooks/use-lifi";
import { hasPendingExchangeRedirect } from "@/lib/exchanges";

// =============================================================================
// TYPES
// =============================================================================

interface UseWidgetNavigationOptions {
  /** Widget mode - determines initial screen */
  mode: "deposit" | "payment";
  /** Initial payment amount for payment mode */
  initialAmount?: number;
  /** Transition duration in ms */
  transitionDuration?: number;
  /** Called when swap state should be reset */
  onResetSwap?: () => void;
  /** Whether the page loaded from an OAuth redirect (detected server-side) */
  isOAuthRedirect?: boolean;
}

interface UseWidgetNavigationReturn {
  // State
  screen: Screen;
  isTransitioning: boolean;
  loggedIn: boolean;

  // Navigation
  transitionTo: (screen: Screen) => void;
  goToAssets: (amount?: number) => void;
  goToConnect: (amount?: number) => void;
  goToDepositAmount: () => void;
  goToConnectedWallets: () => void;
  goToAddWallet: () => void;
  goToConnectChain: (wallet: WalletGroup) => void;
  goToAddWalletChain: (wallet: WalletGroup) => void;
  goToReview: (amount: number, token: TokenAsset) => void;
  goToProcessing: (
    amount: number,
    token: TokenAsset,
    steps: TransactionStep[],
  ) => void;
  goToExchangeWhitelisting: (walletAddress: string, amount?: number) => void;

  // Processing updates
  updateProcessingSteps: (update: ExecutionUpdate) => void;

  // Helpers
  getCurrentAmount: () => number;

  /**
   * Suppress the next auto-navigation to assets on login.
   * Used when handling OAuth redirects that need intermediate screens
   * (e.g., Kraken whitelisting) before showing assets.
   */
  suppressAutoNavigation: () => void;

  // WalletConnect cancel state
  walletConnectCancel: (() => void) | null;
  setWalletConnectCancel: (fn: (() => void) | null) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useWidgetNavigation(
  options: UseWidgetNavigationOptions,
): UseWidgetNavigationReturn {
  const {
    mode,
    initialAmount = 0,
    transitionDuration = 150,
    onResetSwap,
    isOAuthRedirect = false,
  } = options;

  const loggedIn = useAuth();
  const hasAutoNavigated = useRef(false);
  const suppressNextAutoNav = useRef(false);

  // Initial screen depends on mode.
  // If returning from an exchange OAuth redirect, show a loading state
  // instead of the normal initial screen so the user doesn't see a flash.
  // `isOAuthRedirect` is detected server-side from URL params, so the
  // very first render already shows the spinner.
  const getInitialScreen = (): Screen => {
    if (isOAuthRedirect || hasPendingExchangeRedirect()) {
      return { type: "exchange-connecting", amount: initialAmount };
    }
    if (mode === "deposit") return { type: "deposit-amount" };
    return { type: "connect", amount: initialAmount };
  };

  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [walletConnectCancel, setWalletConnectCancel] = useState<
    (() => void) | null
  >(null);

  // Get current amount from screen state
  const getCurrentAmount = useCallback((): number => {
    if ("amount" in screen) return screen.amount;
    return initialAmount;
  }, [screen, initialAmount]);

  // ===========================================================================
  // AUTH-REACTIVE EFFECTS (consolidated)
  // ===========================================================================

  // Handle auth state changes
  useEffect(() => {
    const screenType = screen.type as ScreenType;

    // Don't auto-navigate if we're on the exchange-connecting screen --
    // the OAuth redirect handler manages navigation from there.
    if (screenType === "exchange-connecting") return;

    // Auto-navigate to assets when logged in from connect screen
    // (unless suppressed by OAuth redirect handling)
    if (
      loggedIn &&
      !hasAutoNavigated.current &&
      (screenType === "connect" || screenType === "connect-chain")
    ) {
      hasAutoNavigated.current = true;
      if (suppressNextAutoNav.current) {
        suppressNextAutoNav.current = false;
        return;
      }
      setScreen({ type: "assets", amount: getCurrentAmount() });
      return;
    }

    // Reset when logged out from a protected screen
    if (!loggedIn && isProtectedScreen(screenType)) {
      hasAutoNavigated.current = false;
      setScreen({ type: "connect", amount: getCurrentAmount() });
    }
  }, [loggedIn, screen.type, getCurrentAmount]);

  // Reset swap when navigating to certain screens
  useEffect(() => {
    if (shouldResetOnScreen(screen.type as ScreenType)) {
      onResetSwap?.();
    }
  }, [screen.type, onResetSwap]);

  // ===========================================================================
  // NAVIGATION FUNCTIONS
  // ===========================================================================

  const transitionTo = useCallback(
    (newScreen: Screen) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setScreen(newScreen);
        setIsTransitioning(false);
      }, transitionDuration);
    },
    [transitionDuration],
  );

  const goToAssets = useCallback(
    (amount?: number) =>
      transitionTo({ type: "assets", amount: amount ?? getCurrentAmount() }),
    [transitionTo, getCurrentAmount],
  );

  const goToConnect = useCallback(
    (amount?: number) =>
      transitionTo({ type: "connect", amount: amount ?? getCurrentAmount() }),
    [transitionTo, getCurrentAmount],
  );

  const goToDepositAmount = useCallback(
    () => transitionTo({ type: "deposit-amount" }),
    [transitionTo],
  );

  const goToConnectedWallets = useCallback(
    () =>
      transitionTo({ type: "connected-wallets", amount: getCurrentAmount() }),
    [transitionTo, getCurrentAmount],
  );

  const goToAddWallet = useCallback(
    () => transitionTo({ type: "add-wallet", amount: getCurrentAmount() }),
    [transitionTo, getCurrentAmount],
  );

  const goToConnectChain = useCallback(
    (wallet: WalletGroup) =>
      transitionTo({
        type: "connect-chain",
        wallet,
        amount: getCurrentAmount(),
      }),
    [transitionTo, getCurrentAmount],
  );

  const goToAddWalletChain = useCallback(
    (wallet: WalletGroup) =>
      transitionTo({
        type: "add-wallet-chain",
        wallet,
        amount: getCurrentAmount(),
      }),
    [transitionTo, getCurrentAmount],
  );

  const goToReview = useCallback(
    (amount: number, token: TokenAsset) =>
      transitionTo({ type: "review", amount, token }),
    [transitionTo],
  );

  const goToProcessing = useCallback(
    (amount: number, token: TokenAsset, steps: TransactionStep[]) =>
      transitionTo({ type: "processing", amount, token, steps }),
    [transitionTo],
  );

  const goToExchangeWhitelisting = useCallback(
    (walletAddress: string, amount?: number) =>
      transitionTo({
        type: "exchange-whitelisting",
        walletAddress,
        amount: amount ?? getCurrentAmount(),
      }),
    [transitionTo, getCurrentAmount],
  );

  const suppressAutoNavigation = useCallback(() => {
    suppressNextAutoNav.current = true;
  }, []);

  // Update processing steps based on LI.FI execution updates
  const updateProcessingSteps = useCallback((update: ExecutionUpdate) => {
    setScreen((currentScreen) => {
      if (currentScreen.type !== "processing") return currentScreen;
      const newSteps = updateTransactionSteps(currentScreen.steps, update);
      const explorerLink =
        update.lifiExplorerLink || currentScreen.explorerLink;
      return { ...currentScreen, steps: newSteps, explorerLink };
    });
  }, []);

  return {
    // State
    screen,
    isTransitioning,
    loggedIn,

    // Navigation
    transitionTo,
    goToAssets,
    goToConnect,
    goToDepositAmount,
    goToConnectedWallets,
    goToAddWallet,
    goToConnectChain,
    goToAddWalletChain,
    goToReview,
    goToProcessing,
    goToExchangeWhitelisting,

    // Processing updates
    updateProcessingSteps,

    // Helpers
    getCurrentAmount,
    suppressAutoNavigation,

    // WalletConnect cancel state
    walletConnectCancel,
    setWalletConnectCancel,
  };
}
