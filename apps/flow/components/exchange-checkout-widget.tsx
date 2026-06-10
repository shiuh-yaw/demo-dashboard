"use client";

/**
 * Exchange-Aware Checkout Widget
 *
 * Wraps `<CheckoutWidget />` from `@dynamic-demos/checkouts-widget` and
 * adds exchange (Kraken) connector support. Two modes:
 *
 * 1. **Wallet mode** (default) — renders `<CheckoutWidget />` with
 *    exchange rows injected via `walletPickerExtrasAfter`. Standard
 *    wallet flow is completely unmodified.
 *
 * 2. **Exchange mode** — activated when a user connects an exchange
 *    via OAuth or returns from an OAuth redirect. Renders a custom
 *    exchange-specific flow (asset list → whitelisting → review →
 *    processing) using leaf screens from the package.
 *
 * Props mirror `CheckoutWidgetProps` with additional exchange config.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CheckoutWidget,
  type CheckoutWidgetProps,
  type TokenAsset,
  formatUsd,
  ReviewPaymentScreen,
  type TokenInfo,
  generateTransactionSteps,
  updateTransactionSteps,
  type TransactionStep,
} from "@dynamic-demos/checkouts-widget";
import { WidgetCard, Button } from "@dynamic-demos/ui";
import {
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
} from "@/lib/dynamic/flow-sdk";
import {
  EXCHANGES,
  getExchangeAdapter,
  getActiveExchangeAdapter,
  saveExchangeRedirectState,
  consumeExchangeRedirectState,
} from "@/lib/exchanges";
import type { ExchangeProvider } from "@/lib/exchanges/types";
import { ExchangeRows } from "./exchange-rows";
import { ExchangeAssetList } from "./exchange-asset-list";
import { ExchangeWhitelistingScreen } from "./exchange-whitelisting-screen";
import { BackButton } from "./back-button";

// =============================================================================
// TYPES
// =============================================================================

type ExchangeScreen =
  | { type: "wallet" }
  | { type: "exchange-connecting" }
  | { type: "exchange-assets"; exchangeKey: string }
  | {
      type: "exchange-whitelisting";
      exchangeKey: string;
      walletAddress: string;
      amount: number;
      token: TokenAsset;
    }
  | {
      type: "exchange-review";
      exchangeKey: string;
      amount: number;
      token: TokenAsset;
    }
  | {
      type: "exchange-processing";
      exchangeKey: string;
      amount: number;
      token: TokenAsset;
      steps: TransactionStep[];
    }
  | {
      type: "exchange-done";
      exchangeKey: string;
      amount: number;
      token: TokenAsset;
    }
  | {
      type: "exchange-error";
      exchangeKey: string;
      error: string;
      amount?: number;
      token?: TokenAsset;
    };

export interface ExchangeCheckoutWidgetProps extends CheckoutWidgetProps {
  /** Destination address for exchange transfers. */
  exchangeDestinationAddress?: string;
  /** Settlement chain name (e.g. "EVM"). */
  exchangeSettlementChain?: string;
  /** Settlement chain id (e.g. 8453 for Base). */
  exchangeSettlementChainId?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExchangeCheckoutWidget({
  exchangeDestinationAddress,
  exchangeSettlementChain = "EVM",
  exchangeSettlementChainId = 8453,
  ...widgetProps
}: ExchangeCheckoutWidgetProps) {
  const [screen, setScreen] = useState<ExchangeScreen>({ type: "wallet" });
  const [activeExchangeKey, setActiveExchangeKey] = useState<string | null>(
    null,
  );
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const oauthHandled = useRef(false);

  // Effective amount: host-supplied or user-entered via deposit amount picker.
  // For deposit mode (amountFirst), the user picks an amount before seeing the
  // wallet picker — captured via onAmountSelected below.
  const hostAmount = widgetProps.amount ? parseFloat(widgetProps.amount) : 0;
  const [userSelectedAmount, setUserSelectedAmount] = useState(0);
  const effectiveAmount = userSelectedAmount > 0 ? userSelectedAmount : hostAmount;

  // ---------------------------------------------------------
  // OAuth redirect detection on mount
  // ---------------------------------------------------------
  useEffect(() => {
    if (oauthHandled.current) return;

    const handleOAuthReturn = async () => {
      const redirectState = consumeExchangeRedirectState();

      try {
        const isRedirect = await detectOAuthRedirect();
        if (!isRedirect) {
          // Not an OAuth redirect — if we consumed stale sessionStorage,
          // stay on the wallet screen (default).
          return;
        }

        oauthHandled.current = true;
        setScreen({ type: "exchange-connecting" });

        // Complete social auth — must happen before cleaning URL params
        // since the SDK reads them.
        await completeSocialAuthentication();

        // Strip Dynamic OAuth params from the URL so a page refresh
        // doesn't land on the loading screen again.
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("dynamicOauthCode");
        cleanUrl.searchParams.delete("dynamicOauthState");
        window.history.replaceState({}, "", cleanUrl.toString());

        const exchangeKey = redirectState?.exchangeKey ?? "kraken";
        setActiveExchangeKey(exchangeKey);
        // Restore the user-entered amount from before the OAuth redirect
        if (redirectState?.depositAmount) {
          setUserSelectedAmount(redirectState.depositAmount);
        }
        setScreen({ type: "exchange-assets", exchangeKey });
      } catch (err) {
        console.error("[ExchangeCheckoutWidget] OAuth completion failed:", err);
        setScreen({ type: "wallet" });
      }
    };

    handleOAuthReturn();
  }, []);

  // ---------------------------------------------------------
  // Exchange selection → OAuth redirect
  // ---------------------------------------------------------
  const handleExchangeSelect = useCallback(
    async (exchange: ExchangeProvider) => {
      try {
        saveExchangeRedirectState({
          exchangeKey: exchange.key,
          depositAmount: effectiveAmount,
        });

        await authenticateWithSocial({
          provider: exchange.socialProvider,
          redirectUrl: window.location.href,
        });
      } catch (err) {
        console.error(
          "[ExchangeCheckoutWidget] OAuth initiation failed:",
          err,
        );
      }
    },
    [effectiveAmount],
  );

  // ---------------------------------------------------------
  // Token selection → whitelisting check → review
  // ---------------------------------------------------------
  const handleExchangeTokenSelect = useCallback(
    async (token: TokenAsset) => {
      const exchangeKey = activeExchangeKey ?? "kraken";
      const exchange = getActiveExchangeAdapter(exchangeKey);
      if (!exchange) return;

      const paymentAmount =
        effectiveAmount > 0 ? effectiveAmount : parseFloat(token.balance) || 0;

      // Check whitelisting
      if (exchangeDestinationAddress) {
        try {
          const { required, isWhitelisted } =
            await exchange.adapter.checkWhitelisting(
              exchangeDestinationAddress,
              token.symbol,
            );
          if (required && !isWhitelisted) {
            setScreen({
              type: "exchange-whitelisting",
              exchangeKey,
              walletAddress: exchangeDestinationAddress,
              amount: paymentAmount,
              token,
            });
            return;
          }
        } catch (err) {
          console.error(
            "[ExchangeCheckoutWidget] Whitelisting check failed:",
            err,
          );
        }
      }

      setScreen({
        type: "exchange-review",
        exchangeKey,
        amount: paymentAmount,
        token,
      });
    },
    [activeExchangeKey, effectiveAmount, exchangeDestinationAddress],
  );

  // ---------------------------------------------------------
  // Transfer execution
  // ---------------------------------------------------------
  const handleConfirmTransfer = useCallback(async () => {
    if (screen.type !== "exchange-review") return;
    const { exchangeKey, amount, token } = screen;

    const exchange = getActiveExchangeAdapter(exchangeKey);
    if (!exchange) return;

    setExchangeError(null);
    setIsExecuting(true);

    const steps = generateTransactionSteps(
      widgetProps.mode ?? "payment",
      false,
      token.symbol,
      widgetProps.destinationToken?.symbol ?? token.symbol,
    );
    if (steps[0]) steps[0].status = "active";
    setScreen({
      type: "exchange-processing",
      exchangeKey,
      amount,
      token,
      steps,
    });

    try {
      const destinationAddress =
        exchangeDestinationAddress ?? widgetProps.destinationAddress;

      const result = await exchange.adapter.createTransfer({
        to: destinationAddress,
        amount,
        currency: token.symbol,
        chainName: exchangeSettlementChain,
        networkId: String(exchangeSettlementChainId),
        idempotencyKey: crypto.randomUUID(),
      });

      updateTransactionSteps(steps, {
        status: "DONE",
      });

      setScreen({
        type: "exchange-done",
        exchangeKey,
        amount,
        token,
      });

      widgetProps.onExecutionUpdate?.({
        stepIndex: 0,
        totalSteps: 1,
        status: "DONE",
        txHash: `exchange:${exchangeKey}:${result.transferId}`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transfer failed. Please try again.";
      setExchangeError(message);
      setScreen({
        type: "exchange-error",
        exchangeKey,
        error: message,
        amount,
        token,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [
    screen,
    exchangeDestinationAddress,
    exchangeSettlementChain,
    exchangeSettlementChainId,
    widgetProps,
  ]);

  // ---------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------
  const goToWallet = useCallback(() => {
    setActiveExchangeKey(null);
    setExchangeError(null);
    setScreen({ type: "wallet" });
  }, []);

  const goToExchangeAssets = useCallback(
    (key?: string) => {
      const exchangeKey = key ?? activeExchangeKey ?? "kraken";
      setExchangeError(null);
      setScreen({ type: "exchange-assets", exchangeKey });
    },
    [activeExchangeKey],
  );

  // ---------------------------------------------------------
  // RENDER: wallet mode — standard CheckoutWidget + exchange rows
  // ---------------------------------------------------------
  if (screen.type === "wallet") {
    return (
      <CheckoutWidget
        {...widgetProps}
        onAmountSelected={(amt) => {
          setUserSelectedAmount(parseFloat(amt) || 0);
          widgetProps.onAmountSelected?.(amt);
        }}
        walletPickerExtrasAfter={
          <ExchangeRows
            exchanges={EXCHANGES}
            onSelect={handleExchangeSelect}
          />
        }
      />
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange-connecting (OAuth in-progress)
  // ---------------------------------------------------------
  if (screen.type === "exchange-connecting") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-5">
            <div className="w-8 h-8 border-2 border-[var(--brand-accent,#0050ff)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--brand-muted,#99a0ae)]">
              Connecting to exchange...
            </p>
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange asset selection
  // ---------------------------------------------------------
  if (screen.type === "exchange-assets") {
    const adapter = getExchangeAdapter(screen.exchangeKey);
    if (!adapter) {
      goToWallet();
      return null;
    }

    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="px-5 py-5">
            <ExchangeAssetList
              adapter={adapter}
              onSelected={handleExchangeTokenSelect}
              onChangeSource={goToWallet}
              mode={widgetProps.mode ?? "payment"}
              amount={widgetProps.amount}
              currency={widgetProps.currency}
            />
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange whitelisting
  // ---------------------------------------------------------
  if (screen.type === "exchange-whitelisting") {
    const adapter = getExchangeAdapter(screen.exchangeKey);
    return (
      <div className="flex flex-col gap-2">
        <BackButton
          onClick={() => goToExchangeAssets(screen.exchangeKey)}
          label="Back to tokens"
        />
        <ExchangeWhitelistingScreen
          walletAddress={screen.walletAddress}
          onDone={() =>
            setScreen({
              type: "exchange-review",
              exchangeKey: screen.exchangeKey,
              amount: screen.amount,
              token: screen.token,
            })
          }
          onClose={() => goToExchangeAssets(screen.exchangeKey)}
          onVerifyWhitelist={async () => {
            if (!adapter)
              return { required: false, isWhitelisted: true };
            return adapter.checkWhitelisting(
              screen.walletAddress,
              screen.token.symbol,
            );
          }}
          exchangeUrl={adapter?.websiteUrl}
        />
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange review
  // ---------------------------------------------------------
  if (screen.type === "exchange-review") {
    const mode = widgetProps.mode ?? "payment";
    const amountStr = String(screen.amount);
    const usdStr = formatUsd(screen.amount);

    const sourceToken: TokenInfo = {
      name: screen.token.name,
      symbol: screen.token.symbol,
      amount: amountStr,
      usdValue: usdStr,
      iconUrl: screen.token.iconUrl,
      chainId: screen.token.chainId,
    };

    const feeBreakdown = {
      itemTotal: { usd: usdStr, token: `${amountStr} ${screen.token.symbol}` },
      networkFee: { usd: "$0.00", token: `0 ${screen.token.symbol}` },
      totalAmount: { usd: usdStr, token: `${amountStr} ${screen.token.symbol}` },
    };

    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <ReviewPaymentScreen
            mode={mode}
            sourceToken={sourceToken}
            destinationAddress={exchangeDestinationAddress}
            itemTotal={feeBreakdown.itemTotal}
            networkFee={feeBreakdown.networkFee}
            totalAmount={feeBreakdown.totalAmount}
            isExecuting={isExecuting}
            error={exchangeError}
            onBack={() => goToExchangeAssets(screen.exchangeKey)}
            onConfirm={handleConfirmTransfer}
            onClearError={() => setExchangeError(null)}
          />
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange processing
  // ---------------------------------------------------------
  if (screen.type === "exchange-processing") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-5">
            <div className="w-10 h-10 border-2 border-[var(--brand-accent,#0050ff)] border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--brand-fg,#0e121b)]">
                Processing transfer
              </p>
              <p className="text-xs text-[var(--brand-muted,#99a0ae)] mt-1">
                {screen.amount} {screen.token.symbol} from{" "}
                {getExchangeAdapter(screen.exchangeKey)?.name ?? "exchange"}
              </p>
            </div>
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange done
  // ---------------------------------------------------------
  if (screen.type === "exchange-done") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-5">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--brand-fg,#0e121b)]">
                Transfer initiated
              </p>
              <p className="text-xs text-[var(--brand-muted,#99a0ae)] mt-1">
                {screen.amount} {screen.token.symbol} is being sent from{" "}
                {getExchangeAdapter(screen.exchangeKey)?.name ?? "exchange"}
              </p>
            </div>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => {
                widgetProps.onCancelled?.();
                goToWallet();
              }}
            >
              Done
            </Button>
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange error
  // ---------------------------------------------------------
  if (screen.type === "exchange-error") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-5">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--brand-fg,#0e121b)]">
                Transfer failed
              </p>
              <p className="text-xs text-[var(--brand-muted,#99a0ae)] mt-1">
                {screen.error}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" onClick={goToWallet}>
                Back
              </Button>
              {screen.token && screen.amount && (
                <Button
                  onClick={() =>
                    setScreen({
                      type: "exchange-review",
                      exchangeKey: screen.exchangeKey,
                      amount: screen.amount!,
                      token: screen.token!,
                    })
                  }
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </WidgetCard>
      </div>
    );
  }

  return null;
}
