"use client";

/**
 * Payment Widget
 *
 * Main entry point for the payment/deposit widget. Orchestrates screen
 * navigation, wallet connections, and transaction execution.
 *
 * Architecture:
 * - Navigation state/logic: ./use-navigation.ts
 * - Payment actions (quotes, swaps, transfers): ./use-payment-actions.ts
 * - Payment execution: ./use-payment-execution.ts
 * - Exchange OAuth flow: ./use-exchange-oauth.ts
 * - Types and helpers: ./utils.ts
 * - Screen components: ./screens/
 * - Transaction lifecycle: @/hooks/use-transaction
 *
 * @module components/payment-widget
 */

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { logout, ensureEmbeddedWallet } from "@/lib/dynamicClient";
import { useTransaction } from "@/hooks/use-transaction";
import { cancelTransaction } from "@/lib/api/transactions";
import { useWidgetNavigation } from "./use-navigation";
import { usePaymentActions } from "./use-payment-actions";
import { useExchangeOAuth } from "./use-exchange-oauth";
import type { Transaction } from "@/lib/types";
import ConnectWalletScreen from "../connect-wallet-screen";
import AssetSelectorScreen from "@/components/payment-modal/asset-selector-screen";
import ConnectedWalletsScreen from "@/components/payment-modal/connected-wallets-screen";
import DepositAmountScreen from "@/components/payment-modal/deposit-amount-screen";
import KrakenWhitelistingScreen from "@/components/payment-modal/kraken-whitelisting-screen";
import { WidgetCard } from "@dynamic-demos/ui";
import { ReviewScreen } from "./screens/review-screen";
import { ProcessingScreen } from "./screens/processing-screen";
import {
  type WidgetConfig,
  type TransactionConfig,
  createWidgetConfig,
} from "@/lib/widget-config";
import { getHeaderConfig, isCancellableStatus } from "./utils";
import {
  EXCHANGES,
  getExchangeAdapter,
  resolveActiveExchangeKey,
} from "@/lib/exchanges";

// =============================================================================
// PROPS
// =============================================================================

interface PaymentWidgetProps {
  /**
   * Checkout ID for transaction tracking.
   * Required for transaction lifecycle management.
   */
  checkoutId: string;

  /**
   * Static widget configuration (mode, settlement, UI settings, etc.)
   * Typically fetched from server or set in environment config.
   */
  config: Partial<WidgetConfig>;

  /**
   * Per-transaction configuration (payment amount, externalId, metadata)
   * Provided by the parent component for each payment session.
   */
  transaction?: TransactionConfig;
  /**
   * Initial transaction if one already exists (server-side fetched)
   * Used to show completion screen immediately for confirmed transactions.
   */
  initialTransaction?: Transaction | null;
  /**
   * Whether the page loaded from an OAuth redirect (detected server-side
   * via dynamicOauthCode/dynamicOauthState URL params).
   * When true, the widget starts with a loading screen instead of the
   * normal initial screen to avoid a flash.
   */
  isOAuthRedirect?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PaymentWidget({
  checkoutId,
  config: configProp,
  transaction: transactionConfig = {},
  initialTransaction = null,
  isOAuthRedirect = false,
}: PaymentWidgetProps) {
  // Merge provided config with defaults
  const config = createWidgetConfig(configProp);

  // Memoize initialParams to prevent infinite loops
  // (new object reference would cause initialize callback to recreate)
  const initialParams = useMemo(
    () => ({
      externalId: transactionConfig.externalId,
      metadata: transactionConfig.metadata,
    }),
    [transactionConfig.externalId, transactionConfig.metadata],
  );

  // Transaction lifecycle management
  const {
    transaction: trackedTransaction,
    initialize: initializeTransaction,
    submit: submitTrackedTransaction,
    reset: resetTransaction,
  } = useTransaction({
    checkoutId,
    initialParams,
    initialTransaction,
  });

  // Navigation state and helpers
  const {
    screen,
    isTransitioning,
    loggedIn,
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
    updateProcessingSteps,
    getCurrentAmount,
    walletConnectCancel,
    setWalletConnectCancel,
  } = useWidgetNavigation({
    mode: config.mode,
    initialAmount: transactionConfig.paymentAmount ?? 0,
    transitionDuration: config.ui?.transitionDuration,
    isOAuthRedirect,
  });

  // Track previous loggedIn state to detect login transition
  const prevLoggedInRef = useRef(loggedIn);

  // Initialize transaction when:
  // 1. User logs in (transition from false → true)
  // 2. User is logged in and transaction is reset (e.g., after completing a deposit)
  // Use useLayoutEffect to run synchronously after render but before paint
  useLayoutEffect(() => {
    const justLoggedIn = loggedIn && !prevLoggedInRef.current;
    const needsTransaction = loggedIn && !trackedTransaction;

    if (justLoggedIn || needsTransaction) {
      initializeTransaction();
    }

    prevLoggedInRef.current = loggedIn;
  }, [loggedIn, trackedTransaction, initializeTransaction]);

  // Exchange OAuth flow (connection, redirect detection, active exchange state)
  const { activeExchangeKey, setActiveExchangeKey, handleExchangeSelect } =
    useExchangeOAuth({
      mode: config.mode,
      getCurrentAmount,
      goToAssets,
      goToConnect,
      goToDepositAmount,
    });

  /**
   * Resolve the destination wallet address for exchange transfers.
   * Uses embedded wallet when depositDestination is "embedded",
   * otherwise uses the settlement recipientAddress from config.
   */
  const resolveDestinationAddress = useCallback(async (): Promise<
    string | null
  > => {
    if (config.depositDestination === "embedded") {
      const chain = config.settlement?.chain ?? "EVM";
      const wallet = await ensureEmbeddedWallet(chain);
      return wallet?.address ?? null;
    }
    return config.recipientAddress ?? null;
  }, [
    config.depositDestination,
    config.settlement?.chain,
    config.recipientAddress,
  ]);

  // Payment actions (quotes, swaps, transfers)
  const {
    quote,
    isLoading,
    isExecuting,
    error,
    clearError,
    reset,
    handleTokenSelect,
    handleConfirmPayment,
    embeddedWalletAddress,
  } = usePaymentActions({
    config,
    activeExchangeKey,
    getCurrentAmount,
    goToReview,
    goToProcessing,
    updateProcessingSteps,
    trackedTransaction,
    submitTrackedTransaction,
    checkoutId,
    goToExchangeWhitelisting,
    resolveDestinationAddress,
  });

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  const handleLogout = useCallback(() => logout(), []);

  const handleWalletConnectStateChange = useCallback(
    (isActive: boolean, cancelFn: (() => void) | null) => {
      // Wrap in a thunk: useState treats bare functions as state updaters and calls them.
      // () => value tells React "return this value as the new state" instead of invoking it.
      setWalletConnectCancel(() => (isActive ? cancelFn : null));
    },
    [setWalletConnectCancel],
  );

  /**
   * Detect the active exchange key, falling back to discovering connected
   * exchanges when activeExchangeKey state is null (e.g., after page refresh).
   */
  const resolveExchangeKey = useCallback(
    (): string | null => resolveActiveExchangeKey(activeExchangeKey),
    [activeExchangeKey],
  );

  const handleDepositConfirm = useCallback(
    (amount: number) => {
      if (loggedIn) goToAssets(amount);
      else goToConnect(amount);
    },
    [loggedIn, goToAssets, goToConnect],
  );

  const handleConfirm = useCallback(() => {
    if (screen.type === "review") handleConfirmPayment(screen);
  }, [screen, handleConfirmPayment]);

  const goBackToAssets = useCallback(async () => {
    // Only cancel if transaction is in a cancellable state
    // Once submitted/pending, the blockchain transaction is in progress and cannot be cancelled
    if (trackedTransaction && isCancellableStatus(trackedTransaction.status)) {
      try {
        await cancelTransaction(checkoutId, trackedTransaction.id);
      } catch {
        // Continue navigation even if cancel fails
      }
    }

    // Clear payment state (quote, errors)
    reset();
    clearError();

    // Navigate back to assets
    goToAssets(getCurrentAmount());
  }, [
    trackedTransaction,
    checkoutId,
    reset,
    clearError,
    goToAssets,
    getCurrentAmount,
  ]);

  const handleProcessingClose = useCallback(async () => {
    // Only cancel if transaction is in a cancellable state
    // Once submitted/pending, the blockchain transaction is in progress and cannot be cancelled
    if (trackedTransaction && isCancellableStatus(trackedTransaction.status)) {
      try {
        await cancelTransaction(checkoutId, trackedTransaction.id);
      } catch {
        // Continue with navigation even if cancel fails
      }
    }

    if (config.mode === "deposit") goToDepositAmount();
    else goToAssets();

    // Reset both payment state and transaction state
    // This ensures a new transaction is created for the next deposit flow
    reset();
    resetTransaction();
  }, [
    config.mode,
    goToDepositAmount,
    goToAssets,
    reset,
    resetTransaction,
    trackedTransaction,
    checkoutId,
  ]);

  const handleProcessingRetry = useCallback(async () => {
    if (screen.type === "processing") {
      const { token } = screen;

      // Clear any errors
      clearError();

      // Request a new quote by calling handleTokenSelect
      // This will fetch a fresh quote and navigate to review screen
      // Note: The quote call automatically transitions cancelled/failed → draft
      await handleTokenSelect(token);
    }
  }, [screen, clearError, handleTokenSelect]);

  // ===========================================================================
  // HEADER CONFIGURATION
  // ===========================================================================

  const header = getHeaderConfig({
    screen,
    mode: config.mode,
    walletConnectCancel,
    goToDepositAmount,
    goToConnect,
    goToConnectedWallets,
    goToAddWallet,
    goToAssets,
  });

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <>
      {/* Exchange OAuth redirect loading state */}
      {screen.type === "exchange-connecting" && (
        <WidgetCard isTransitioning={isTransitioning}>
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-(--brand-accent) border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-(--brand-muted)">
              Completing sign-in...
            </p>
          </div>
        </WidgetCard>
      )}

      {/* Deposit Amount Entry */}
      {screen.type === "deposit-amount" && (
        <WidgetCard isTransitioning={isTransitioning}>
          <DepositAmountScreen
            presets={config.depositPresets}
            minAmount={config.minDepositAmount}
            maxAmount={config.maxDepositAmount}
            onConfirm={handleDepositConfirm}
          />
        </WidgetCard>
      )}

      {/* Connect / Chain Selection */}
      {(screen.type === "connect" || screen.type === "connect-chain") &&
        header && (
          <ConnectWalletScreen
            title={header.title}
            subtitle={header.subtitle}
            onBack={header.onBack}
            isTransitioning={isTransitioning}
            onSuccess={() => goToAssets()}
            selectedWalletForChain={
              screen.type === "connect-chain" ? screen.wallet : null
            }
            onNavigateToChainSelect={goToConnectChain}
            onWalletConnectStateChange={handleWalletConnectStateChange}
            exchanges={EXCHANGES}
            onExchangeSelect={handleExchangeSelect}
          />
        )}

      {/* Assets */}
      {screen.type === "assets" && loggedIn && (
        <WidgetCard isTransitioning={isTransitioning}>
          <AssetSelectorScreen
            mode={config.mode}
            paymentAmount={screen.amount}
            activeExchangeKey={activeExchangeKey}
            settlementTokenSymbol={config.settlement?.tokenSymbol}
            onSelectToken={handleTokenSelect}
            onSwitchWallet={goToConnectedWallets}
            onClose={
              config.mode === "deposit" ? goToDepositAmount : handleLogout
            }
            isLoadingQuote={isLoading}
            quoteError={error}
          />
        </WidgetCard>
      )}

      {/* Review Payment */}
      {screen.type === "review" && loggedIn && (
        <ReviewScreen
          amount={screen.amount}
          token={screen.token}
          config={config}
          quote={quote}
          embeddedWalletAddress={embeddedWalletAddress}
          isExecuting={isExecuting || isLoading}
          error={error}
          isTransitioning={isTransitioning}
          onConfirm={handleConfirm}
          onBack={goBackToAssets}
          onClose={config.mode === "deposit" ? goToDepositAmount : handleLogout}
          onClearError={clearError}
        />
      )}

      {/* Transaction Processing */}
      {screen.type === "processing" && loggedIn && (
        <ProcessingScreen
          amount={screen.amount}
          token={screen.token}
          steps={screen.steps}
          explorerLink={screen.explorerLink}
          config={config}
          quote={quote}
          error={error}
          isTransitioning={isTransitioning}
          onClose={handleProcessingClose}
          onRetry={handleProcessingRetry}
        />
      )}

      {/* Connected Wallets */}
      {screen.type === "connected-wallets" && header && (
        <WidgetCard isTransitioning={isTransitioning}>
          <ConnectedWalletsScreen
            onAddNewWallet={goToAddWallet}
            onSelectWallet={() => {
              setActiveExchangeKey(null);
              goToAssets();
            }}
            onClose={header.onClose}
            activeExchangeKey={activeExchangeKey}
            onSelectExchange={(key) => {
              setActiveExchangeKey(key);
              goToAssets();
            }}
          />
        </WidgetCard>
      )}

      {/* Kraken Whitelisting */}
      {screen.type === "exchange-whitelisting" && loggedIn && (
        <KrakenWhitelistingScreen
          walletAddress={screen.walletAddress}
          onDone={() => goToAssets(screen.amount)}
          onClose={() => goToAssets(screen.amount)}
          onVerifyWhitelist={async () => {
            const exchangeKey = resolveExchangeKey() ?? "kraken";
            const adapter = getExchangeAdapter(exchangeKey);
            if (!adapter) return { required: false, isWhitelisted: true };
            return adapter.checkWhitelisting(screen.walletAddress);
          }}
        />
      )}

      {/* Add Wallet / Chain Selection */}
      {(screen.type === "add-wallet" || screen.type === "add-wallet-chain") &&
        header && (
          <ConnectWalletScreen
            title={header.title}
            subtitle={header.subtitle}
            onBack={header.onBack}
            onClose={header.onClose}
            isTransitioning={isTransitioning}
            onSuccess={goToConnectedWallets}
            selectedWalletForChain={
              screen.type === "add-wallet-chain" ? screen.wallet : null
            }
            onNavigateToChainSelect={goToAddWalletChain}
            onWalletConnectStateChange={handleWalletConnectStateChange}
            exchanges={EXCHANGES}
            onExchangeSelect={handleExchangeSelect}
          />
        )}
    </>
  );
}
