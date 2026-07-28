"use client";

/**
 * Exchange-Aware Checkout Widget
 *
 * Wraps `<CheckoutWidget />` from `@dynamic-demos/checkouts-widget` and
 * adds exchange (Kraken) connector support. Three modes:
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
 * 3. **Deposit-address mode** - activated from a picker row when the
 *    host supplies `createDepositAddressFlow`. Drives the real Flow
 *    lifecycle (create → attach deposit_address source → quote →
 *    poll) with no signing step; the user sends funds externally.
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
  TransactionProgressScreen,
} from "@dynamic-demos/checkouts-widget";
import { WidgetCard, Button } from "@dynamic-demos/ui";
import {
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
  attachDepositAddressSource,
  getCheckoutTransactionQuote,
  getCheckoutTransaction,
  cancelCheckoutTransaction,
} from "@/lib/dynamic/flow-sdk";
import {
  EXCHANGES,
  getExchangeAdapter,
  getActiveExchangeAdapter,
  saveExchangeRedirectState,
  consumeExchangeRedirectState,
  exchangeOAuthReturnUrl,
} from "@/lib/exchanges";
import type { ExchangeProvider } from "@/lib/exchanges/types";
import { ExchangeRows } from "./exchange-rows";
import { ExchangeAssetList } from "./exchange-asset-list";
import { ExchangeWhitelistingScreen } from "./exchange-whitelisting-screen";
import { BackButton } from "./back-button";
import {
  DEPOSIT_ADDRESS_SOURCE_OPTIONS,
  classifyDepositAddressFlow,
  rawAmountToDecimal,
  type DepositAddressSourceOption,
} from "@/lib/deposit-address";
import { SourceCategoryRows } from "./source-category-rows";
import { DrillInHeader } from "./drill-in-header";
import { DepositAddressAssetList } from "./deposit-address-asset-list";
import { DepositAddressAwaiting } from "./deposit-address-awaiting";

// =============================================================================
// TYPES
// =============================================================================

type ExchangeScreen =
  | { type: "wallet" }
  | { type: "exchange-select" }
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
    }
  | { type: "deposit-address-select" }
  | { type: "deposit-address-generating"; option: DepositAddressSourceOption }
  | {
      type: "deposit-address-awaiting";
      option: DepositAddressSourceOption;
      flowId: string;
      depositAddress: string;
      fromAmount?: string;
      toAmount?: string;
    }
  | {
      type: "deposit-address-done";
      option: DepositAddressSourceOption;
      flowId: string;
      fromAmount?: string;
      toAmount?: string;
      /** Whether settlement reached terminal `settlementState: completed`. */
      settled?: boolean;
    }
  | { type: "deposit-address-error"; error: string };

export interface ExchangeCheckoutWidgetProps extends CheckoutWidgetProps {
  /** Destination address for exchange transfers. */
  exchangeDestinationAddress?: string;
  /** Settlement chain name (e.g. "EVM"). */
  exchangeSettlementChain?: string;
  /** Settlement chain id (e.g. 8453 for Base). */
  exchangeSettlementChainId?: number;
  /**
   * Creates a Flow for the deposit-address funding path. No wallet is
   * connected in this path, so the host must supply the settlement
   * destination inside this callback. Row hidden when omitted.
   */
  createDepositAddressFlow?: (input: {
    amount: string;
    currency: string;
  }) => Promise<string>;
  /**
   * Settlement token for the deposit-address path's confirmation
   * screen (icon, symbol, decimals for the received amount). The
   * settlement lives inside the host's createDepositAddressFlow
   * callback and can differ from the wallet path's destinationToken.
   */
  depositAddressSettlement?: {
    symbol: string;
    decimals: number;
    iconUrl?: string;
  };
  /**
   * First picker screen becomes Wallet / Exchange / Deposit address
   * category rows. Default off - /kyc-deposit relies on the plain
   * wallet list.
   */
  sourceCategories?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExchangeCheckoutWidget({
  exchangeDestinationAddress,
  exchangeSettlementChain = "EVM",
  exchangeSettlementChainId = 8453,
  createDepositAddressFlow,
  depositAddressSettlement,
  sourceCategories,
  ...widgetProps
}: ExchangeCheckoutWidgetProps) {
  const [screen, setScreen] = useState<ExchangeScreen>({ type: "wallet" });
  const [activeExchangeKey, setActiveExchangeKey] = useState<string | null>(
    null,
  );
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [walletListShown, setWalletListShown] = useState(false);
  const oauthHandled = useRef(false);
  const depositAddressBusy = useRef(false);
  // Mirror of `screen` for synchronous reads after `await` points, where
  // the closure's captured `screen` is stale.
  const screenRef = useRef(screen);
  screenRef.current = screen;

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
  // Deposit-address poll: no submit step, so poll getFlow while the
  // awaiting screen is mounted. No client timeout - the user may take
  // minutes to send; the 48h expiry arrives as an API-side state.
  // ---------------------------------------------------------
  useEffect(() => {
    // Poll while awaiting funds AND after reaching done until settlement is
    // terminal, so the confirmation reflects real `settlementState:
    // completed` rather than declaring done at `source_confirmed`.
    const active =
      screen.type === "deposit-address-awaiting"
        ? screen
        : screen.type === "deposit-address-done" && !screen.settled
          ? screen
          : null;
    if (!active) return;
    const { flowId, option, fromAmount, toAmount } = active;
    let stopped = false;

    const interval = setInterval(async () => {
      try {
        const flow = await getCheckoutTransaction({ transactionId: flowId });
        if (stopped) return;
        const advance = (next: ExchangeScreen) => {
          setScreen((prev) =>
            (prev.type === "deposit-address-awaiting" ||
              prev.type === "deposit-address-done") &&
            prev.flowId === flowId
              ? next
              : prev,
          );
        };
        const status = classifyDepositAddressFlow(flow);
        const settled = flow.settlementState === "completed";
        if (status === "confirmed") {
          // Advance awaiting -> done, or flip done.settled true once
          // settlement completes. Leave an already-shown, still-settling
          // done screen untouched (same reference) so the interval keeps
          // ticking without a re-render churn.
          setScreen((prev) => {
            if (
              prev.type === "deposit-address-awaiting" &&
              prev.flowId === flowId
            ) {
              return {
                type: "deposit-address-done",
                option,
                flowId,
                fromAmount,
                toAmount,
                settled,
              };
            }
            if (
              prev.type === "deposit-address-done" &&
              prev.flowId === flowId &&
              settled &&
              !prev.settled
            ) {
              return { ...prev, settled: true };
            }
            return prev;
          });
        } else if (status === "expired") {
          advance({
            type: "deposit-address-error",
            error:
              "This deposit address expired - addresses live 48 hours. Generate a new one to continue.",
          });
        } else if (status === "failed") {
          advance({
            type: "deposit-address-error",
            error: "The deposit failed. Generate a new address to retry.",
          });
        }
      } catch {
        // Transient poll errors keep waiting - the next tick retries.
      }
    }, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [screen]);

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
          // Strip the "#exchange" marker set just above - passing the full href
          // would make the provider redirect back to `...#exchange`, leaking the
          // fragment into the address bar. State is restored from sessionStorage.
          redirectUrl: exchangeOAuthReturnUrl(window.location.href),
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

      if (!destinationAddress) {
        throw new Error(
          "No destination address available. Connect a wallet first.",
        );
      }

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
  // Deposit-address source: create flow -> attach -> quote
  // ---------------------------------------------------------
  const handleDepositAddressSelect = useCallback(
    async (option: DepositAddressSourceOption) => {
      if (!createDepositAddressFlow) return;
      if (depositAddressBusy.current) return;
      if (effectiveAmount <= 0) {
        setScreen({
          type: "deposit-address-error",
          error: "Choose an amount before generating a deposit address.",
        });
        return;
      }

      depositAddressBusy.current = true;
      let createdFlowId: string | null = null;
      setScreen({ type: "deposit-address-generating", option });
      try {
        const flowId = await createDepositAddressFlow({
          amount: String(effectiveAmount),
          currency: widgetProps.currency ?? "USD",
        });
        createdFlowId = flowId;
        await attachDepositAddressSource({
          transactionId: flowId,
          fromChainId: option.fromChainId,
          fromChainName: option.chainName,
        });
        const quoted = await getCheckoutTransactionQuote({
          transactionId: flowId,
          fromTokenAddress: option.tokenAddress,
        });
        const depositAddress =
          quoted.depositAddress ??
          (quoted as { quote?: { depositAddress?: string } }).quote
            ?.depositAddress;
        if (!depositAddress) {
          throw new Error("Quote returned no deposit address.");
        }
        // If the user navigated away during create/attach/quote, the flow
        // is orphaned - cancel it best-effort and do not surface a screen.
        const current = screenRef.current;
        const stillGenerating =
          current.type === "deposit-address-generating" &&
          current.option === option;
        if (stillGenerating) {
          setScreen((prev) =>
            prev.type === "deposit-address-generating" && prev.option === option
              ? {
                  type: "deposit-address-awaiting",
                  option,
                  flowId,
                  depositAddress,
                  fromAmount: quoted.quote?.fromAmount,
                  toAmount: quoted.quote?.toAmount,
                }
              : prev,
          );
        } else {
          cancelCheckoutTransaction({ transactionId: flowId }).catch(() => {
            // Best-effort - abandoning the orphaned flow is fine either way.
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not generate a deposit address. Please try again.";
        if (createdFlowId) {
          cancelCheckoutTransaction({ transactionId: createdFlowId }).catch(
            () => {
              // Best-effort - abandoning the flow is fine either way.
            },
          );
        }
        // Guard the error screen the same way: a late rejection after the
        // user left the generating screen must not yank them to the error.
        setScreen((prev) =>
          prev.type === "deposit-address-generating" && prev.option === option
            ? { type: "deposit-address-error", error: message }
            : prev,
        );
      } finally {
        depositAddressBusy.current = false;
      }
    },
    [createDepositAddressFlow, effectiveAmount, widgetProps.currency],
  );

  const handleDepositAddressCancel = useCallback(() => {
    if (screen.type === "deposit-address-awaiting") {
      cancelCheckoutTransaction({ transactionId: screen.flowId }).catch(
        () => {
          // Best-effort - abandoning the flow is fine either way.
        },
      );
    }
    setWalletListShown(false);
    setScreen({ type: "wallet" });
  }, [screen]);

  // ---------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------
  const goToWallet = useCallback(() => {
    setWalletListShown(false);
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
    const categoriesActive = sourceCategories && !walletListShown;
    return (
      <CheckoutWidget
        {...widgetProps}
        onAmountSelected={(amt) => {
          setUserSelectedAmount(parseFloat(amt) || 0);
          widgetProps.onAmountSelected?.(amt);
        }}
        onDisconnect={() => {
          setWalletListShown(false);
          widgetProps.onDisconnect?.();
        }}
        walletPickerOverride={
          categoriesActive ? (
            <SourceCategoryRows
              onWallet={() => setWalletListShown(true)}
              onExchange={() => setScreen({ type: "exchange-select" })}
              onDepositAddress={
                createDepositAddressFlow
                  ? () => setScreen({ type: "deposit-address-select" })
                  : undefined
              }
            />
          ) : undefined
        }
        walletPickerHeader={
          sourceCategories && walletListShown ? (
            <DrillInHeader
              title="Connect a wallet"
              onBack={() => setWalletListShown(false)}
            />
          ) : (
            widgetProps.walletPickerHeader
          )
        }
        walletPickerExtrasAfter={
          sourceCategories ? undefined : (
            <ExchangeRows
              exchanges={EXCHANGES}
              onSelect={handleExchangeSelect}
            />
          )
        }
      />
    );
  }

  // ---------------------------------------------------------
  // RENDER: exchange selection (supported exchanges list)
  // ---------------------------------------------------------
  if (screen.type === "exchange-select") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="px-5 py-5 flex flex-col gap-4">
            <DrillInHeader title="Pay from an exchange" onBack={goToWallet} />
            <ExchangeRows
              exchanges={EXCHANGES}
              onSelect={handleExchangeSelect}
            />
          </div>
        </WidgetCard>
      </div>
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

    // Build a destination token when the settlement chain differs from the
    // source (exchange tokens use chainId 0). This makes the review card
    // show both sides for cross-chain exchange transfers.
    const destinationToken: TokenInfo | undefined =
      exchangeSettlementChainId != null &&
      exchangeSettlementChainId !== screen.token.chainId
        ? {
            name: widgetProps.destinationToken?.name ?? screen.token.name,
            symbol:
              widgetProps.destinationToken?.symbol ?? screen.token.symbol,
            amount: amountStr,
            usdValue: usdStr,
            iconUrl:
              widgetProps.destinationToken?.logoURI ?? screen.token.iconUrl,
            chainId: exchangeSettlementChainId,
          }
        : undefined;

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
            destinationToken={destinationToken}
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

  // ---------------------------------------------------------
  // RENDER: deposit-address source selection
  // ---------------------------------------------------------
  if (screen.type === "deposit-address-select") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="px-5 py-5">
            <DepositAddressAssetList
              options={DEPOSIT_ADDRESS_SOURCE_OPTIONS}
              onSelected={handleDepositAddressSelect}
              onChangeSource={goToWallet}
            />
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: deposit-address generating
  // ---------------------------------------------------------
  if (screen.type === "deposit-address-generating") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="px-5 pt-5">
            <BackButton onClick={goToWallet} label="Back to sources" />
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-5">
            <div className="w-8 h-8 border-2 border-[var(--brand-accent,#0050ff)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--brand-muted,#99a0ae)]">
              Generating a {screen.option.symbol} deposit address...
            </p>
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: deposit-address awaiting funds
  // ---------------------------------------------------------
  if (screen.type === "deposit-address-awaiting") {
    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <div className="px-5 py-5">
            <DepositAddressAwaiting
              option={screen.option}
              depositAddress={screen.depositAddress}
              fromAmount={screen.fromAmount}
              onCancel={handleDepositAddressCancel}
            />
          </div>
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: deposit-address done (funds detected) - same confirmation
  // surface as the wallet path (TransactionProgressScreen), steps
  // completed; there is no signing step to progress through.
  if (screen.type === "deposit-address-done") {
    const mode = widgetProps.mode ?? "payment";
    const settled = screen.settled === true;
    const settlementSymbol =
      depositAddressSettlement?.symbol ??
      widgetProps.destinationToken?.symbol ??
      "USDC";
    const exactAmount = screen.fromAmount
      ? rawAmountToDecimal(screen.fromAmount, screen.option.tokenDecimals)
      : null;
    const receivedAmount =
      screen.toAmount && depositAddressSettlement
        ? rawAmountToDecimal(screen.toAmount, depositAddressSettlement.decimals)
        : null;
    // Display-only rounding for the settled hero; the awaiting screen's
    // copyable send amount stays full-precision.
    const receivedDisplay = receivedAmount
      ? Number(receivedAmount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

    const steps: TransactionStep[] = [
      {
        id: "detect",
        title: "Deposit detected",
        description: `${screen.option.symbol} received at the deposit address`,
        status: "completed",
      },
      ...(screen.option.symbol !== settlementSymbol
        ? [
            {
              id: "convert",
              title: `Converting to ${settlementSymbol}`,
              description: `Your ${screen.option.symbol} is swapped to ${settlementSymbol}`,
              status: "completed" as const,
            },
          ]
        : []),
      {
        id: "complete",
        title: settled
          ? `${settlementSymbol} settled`
          : `Settling to ${settlementSymbol}`,
        description: settled
          ? `${settlementSymbol} arrived at the destination`
          : `Settling your ${settlementSymbol} to the destination`,
        status: settled ? "completed" : "active",
      },
    ];

    const sourceToken: TokenInfo = {
      name: screen.option.label,
      symbol: screen.option.symbol,
      amount: exactAmount ?? "",
      usdValue: formatUsd(effectiveAmount),
      iconUrl: screen.option.logoURI,
    };

    // Settled hero (icon + received amount) reads from destinationToken;
    // without it the package falls back to a bare check glyph. Only shown
    // once settlement is terminal AND the quote carried a received amount -
    // otherwise the hero would render a blank " USDC".
    const destinationToken: TokenInfo | undefined =
      settled && receivedDisplay && depositAddressSettlement
        ? {
            name: settlementSymbol,
            symbol: settlementSymbol,
            amount: receivedDisplay,
            usdValue: formatUsd(effectiveAmount),
            iconUrl:
              depositAddressSettlement.iconUrl ??
              widgetProps.destinationToken?.logoURI,
          }
        : undefined;

    return (
      <div className="flex flex-col gap-2">
        <WidgetCard>
          <TransactionProgressScreen
            mode={mode}
            sourceToken={sourceToken}
            destinationToken={destinationToken}
            steps={steps}
            onClose={() => {
              widgetProps.onCancelled?.();
              goToWallet();
            }}
          />
        </WidgetCard>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: deposit-address error
  // ---------------------------------------------------------
  if (screen.type === "deposit-address-error") {
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
                Deposit address unavailable
              </p>
              <p className="text-xs text-[var(--brand-muted,#99a0ae)] mt-1">
                {screen.error}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" onClick={goToWallet}>
                Back
              </Button>
              <Button
                onClick={() => setScreen({ type: "deposit-address-select" })}
              >
                Try again
              </Button>
            </div>
          </div>
        </WidgetCard>
      </div>
    );
  }

  return null;
}
