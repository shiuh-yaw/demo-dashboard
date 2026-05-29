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
import { logout, ensureEmbeddedWallet, getPrimaryWalletAccount } from "@/lib/dynamicClient";
import { useTransaction } from "@/hooks/use-transaction";
import {
  cancelTransaction,
  failTransaction,
} from "@/lib/api/transactions";
import { env } from "@/lib/env";
import { useWidgetNavigation } from "./use-navigation";
import { usePaymentActions } from "./use-payment-actions";
import { useExchangeOAuth } from "./use-exchange-oauth";
import type { Transaction } from "@/lib/types";
import type { TokenAsset } from "@dynamic-demos/checkouts-widget";
import { isExchangeToken } from "@dynamic-demos/checkouts-widget";
import ConnectWalletScreen from "../connect-wallet-screen";
import AssetSelectorScreen from "@/components/payment-modal/asset-selector-screen";
import ConnectedWalletsScreen from "@/components/payment-modal/connected-wallets-screen";
import {
  DepositAmountScreen,
  PaymentWidget as CheckoutsPaymentWidget,
  type Token,
} from "@dynamic-demos/checkouts-widget";
import KrakenWhitelistingScreen from "@/components/payment-modal/kraken-whitelisting-screen";
import { WidgetCard } from "@dynamic-demos/ui";
import { ReviewScreen } from "./screens/review-screen";
import { ProcessingScreen } from "./screens/processing-screen";
import {
  type WidgetConfig,
  type SettlementConfig,
  type TransactionConfig,
  createWidgetConfig,
} from "@/lib/widget-config";
import {
  getHeaderConfig,
  isCancellableStatus,
  needsTokenConversion,
} from "./utils";
import {
  EXCHANGES,
  getExchangeAdapter,
  resolveActiveExchangeKey,
} from "@/lib/exchanges";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fixed height for the wallet-flow WidgetCards. PaymentWidget itself enforces
 * h-[30rem] internally; the host applies the same fixed height to the assets
 * card and the pre-mount loading card so the entire flow stays the same size
 * across every transition (asset-pick → quote-loading → review → processing).
 */
const WALLET_FLOW_MIN_H = "h-[27rem]";

/** Map host `TokenAsset` → package `Token` shape. */
function toPackageToken(asset: TokenAsset): Token {
  return {
    address: asset.tokenAddress ?? "",
    chainId: asset.chainId,
    symbol: asset.symbol,
    decimals: asset.decimals,
    name: asset.name ?? asset.symbol,
    logoURI: asset.iconUrl,
  };
}

/** Map host `SettlementConfig` → package `Token` shape. */
function settlementToPackageToken(
  settlement: SettlementConfig | undefined,
): Token {
  if (!settlement) {
    return { address: "", chainId: 0, symbol: "USD", decimals: 6, name: "USD" };
  }
  return {
    address: settlement.tokenAddress,
    chainId: settlement.chainId,
    symbol: settlement.tokenSymbol ?? "USD",
    decimals: settlement.decimals,
    name: settlement.tokenSymbol ?? "USD",
  };
}

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

  // Guard rails for the PaymentWidget callbacks: status-map emits txHash on
  // every poll snapshot, but the dashboard mirror only needs the first one.
  const txHashSubmittedRef = useRef(false);

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
  // DERIVED VALUES (wallet-path delegate to <PaymentWidget />)
  // ===========================================================================

  // Resolve the primary wallet from Dynamic's SDK singleton. Read each render;
  // PaymentWidget's begin-checkout effect is keyed on stage transitions, not on
  // walletAccount identity, so a fresh reference each render is safe.
  const primaryWallet = getPrimaryWalletAccount();

  // PaymentWidget needs a synchronous string destination address. The
  // embedded-wallet branch is pre-resolved in usePaymentActions.handleTokenSelect,
  // so `embeddedWalletAddress` is set by the time we reach this render.
  const resolvedDestinationAddress: string | null = useMemo(() => {
    if (config.depositDestination === "embedded") {
      return embeddedWalletAddress ?? null;
    }
    return config.recipientAddress ?? null;
  }, [
    config.depositDestination,
    config.recipientAddress,
    embeddedWalletAddress,
  ]);

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
        <WidgetCard
          isTransitioning={isTransitioning}
          className={WALLET_FLOW_MIN_H}
        >
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

      {/*
        Wallet token path — the entire amount/review/processing/done
        lifecycle is owned by <PaymentWidget /> from
        @dynamic-demos/checkouts-widget. The host's screen.type stays at
        "review" while PaymentWidget cycles through its own internal stages.
      */}
      {screen.type === "review" &&
        loggedIn &&
        !isExchangeToken(screen.token) &&
        (!resolvedDestinationAddress || !primaryWallet) && (
          <WidgetCard
            isTransitioning={isTransitioning}
            className={WALLET_FLOW_MIN_H}
          >
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-(--brand-accent) border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-(--brand-muted)">
                Preparing payment…
              </p>
            </div>
          </WidgetCard>
        )}

      {screen.type === "review" &&
        loggedIn &&
        !isExchangeToken(screen.token) &&
        resolvedDestinationAddress &&
        primaryWallet && (
          <WidgetCard
            isTransitioning={isTransitioning}
            className={WALLET_FLOW_MIN_H}
          >
            <CheckoutsPaymentWidget
              checkoutId={env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID ?? ""}
              walletAccount={primaryWallet}
              currency={config.settlement?.tokenSymbol ?? "USD"}
              destinationAddress={resolvedDestinationAddress}
              destinationChain={config.settlement?.chain ?? "EVM"}
              fromToken={toPackageToken(screen.token)}
              destinationToken={settlementToPackageToken(config.settlement)}
              needsConversion={needsTokenConversion(
                screen.token,
                config.settlement,
              )}
              isCrossChain={screen.token.chainId !== config.settlement?.chainId}
              amount={String(screen.amount)}
              storageNamespace={env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID}
              memo={{
                externalId: trackedTransaction?.externalId,
                widgetMetadata: trackedTransaction?.metadata,
              }}
              onExecutionUpdate={(update) => {
                // Mirror the FIRST txHash only — status-map re-emits the hash
                // on every poll tick and the dashboard mirror just needs the
                // initial broadcast signal. Hard-failure mirroring is owned by
                // onError so we don't double-POST failTransaction.
                if (
                  update.txHash &&
                  trackedTransaction &&
                  !txHashSubmittedRef.current
                ) {
                  txHashSubmittedRef.current = true;
                  submitTrackedTransaction(update.txHash);
                }
              }}
              onCancelled={() => {
                // Reset so a retry's first txHash still mirrors to the dashboard.
                txHashSubmittedRef.current = false;
                if (trackedTransaction) {
                  cancelTransaction(checkoutId, trackedTransaction.id).catch(
                    () => {},
                  );
                }
                // Unmount the widget — host owns navigation, not PaymentWidget.
                goToAssets(getCurrentAmount());
              }}
              onError={(err) => {
                if (trackedTransaction) {
                  failTransaction(
                    checkoutId,
                    trackedTransaction.id,
                    err.message,
                  ).catch(() => {});
                }
              }}
            />
          </WidgetCard>
        )}

      {/* Exchange (Kraken) token path — keeps the existing host review wrapper */}
      {screen.type === "review" &&
        loggedIn &&
        isExchangeToken(screen.token) && (
          <ReviewScreen
            amount={screen.amount}
            token={screen.token}
            config={config}
            quote={null}
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

      {/*
        Transaction Processing — exchange path only. The wallet path never
        transitions screen.type to "processing"; PaymentWidget renders its
        own progress screen while the host stays at "review".
      */}
      {screen.type === "processing" && loggedIn && (
        <ProcessingScreen
          amount={screen.amount}
          token={screen.token}
          steps={screen.steps}
          explorerLink={screen.explorerLink}
          config={config}
          quote={null}
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
