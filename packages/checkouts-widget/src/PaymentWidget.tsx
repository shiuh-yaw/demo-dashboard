"use client";

/**
 * <PaymentWidget />
 *
 * Top-level, self-contained Dynamic Checkout Flow widget. Drops the
 * amount→review→processing→done state machine into any host app once given
 * a `WalletAccount`, source/destination `Token`s, and a `checkoutId`.
 *
 * Internally:
 * - Owns the lifecycle via `useCheckoutFlow` (create → attach → quote → submit
 *   → poll → terminal).
 * - Mounts the three leaf screens (`DepositAmountScreen`,
 *   `ReviewPaymentScreen`, `TransactionProgressScreen`) based on the current
 *   stage.
 * - Exposes lifecycle callbacks so hosts can react to amount selection,
 *   transaction creation, quote locking, every execution step, settlement,
 *   cancellation, and errors.
 *
 * Hosts are responsible for shaping the `Token` props (chain id, decimals,
 * symbol, etc.) — this component does no token discovery of its own.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, JSX } from "react";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { useCheckoutFlow } from "./hooks/use-checkout-flow";
import DepositAmountScreen from "./components/deposit-amount-screen";
import ReviewPaymentScreen from "./components/review-payment-screen";
import ScreenHeader from "./components/screen-header";
import { ArrowRightIcon } from "./components/icons";
import { Button } from "@dynamic-demos/ui";
import TransactionProgressScreen, {
  generateTransactionSteps,
  updateTransactionSteps,
  type TransactionStep,
} from "./components/transaction-progress-screen";
import {
  buildReviewQuote,
  buildTokenInfo,
  formatTokenDisplayAmount,
  formatUsdSafe,
  getTotalFeeUsd,
} from "./lib/payment-display";
import { isSolanaChainId } from "./lib/chain";
import {
  extractFailureMessage,
  isFailedTerminal,
} from "./checkout-flow/status-map";
import type {
  BrandConfig,
  ExecutionUpdate,
  ReviewQuote,
  Token,
} from "./lib/types";
import type { CheckoutTransaction } from "./checkout-flow";

// =============================================================================
// PROPS
// =============================================================================

export interface PaymentWidgetProps {
  /** Connected wallet account used to sign the flow transaction. */
  walletAccount: WalletAccount;
  /**
   * Server-side Flow creation. Required unless `checkoutId` is set.
   * Invoked when the user reaches the review stage (amount is known).
   */
  createFlow?: (params: {
    amount: string;
    currency: string;
  }) => Promise<string>;
  /** @deprecated Prefer `createFlow`. Legacy reusable Checkout config id. */
  checkoutId?: string;
  /** ISO currency code for the payment amount (e.g. "USD"). */
  currency: string;
  /** Destination address that receives the settlement token. */
  destinationAddress: string;
  /** Destination chain identifier (Dynamic `Chain` enum, e.g. "ETH"). */
  destinationChain: string;
  /** Source token the user is paying / depositing with. */
  fromToken: Token;
  /** Settlement token the destination receives. */
  destinationToken: Token;
  /** Whether the source and destination differ (swap or bridge). */
  needsConversion: boolean;
  /** Whether the swap crosses chains (drives bridge polling + steps). */
  isCrossChain: boolean;

  /** If supplied, the widget skips the amount picker and starts at review. */
  amount?: string;
  /** Preset amounts to show on the amount picker (defaults provided). */
  presetAmounts?: number[];
  /** Brand tokens applied as CSS variables on the widget root. */
  brand?: BrandConfig;
  /** Opaque host-provided metadata forwarded into transaction creation. */
  memo?: Record<string, unknown>;
  /** Namespace for in-flight transaction persistence in localStorage. */
  storageNamespace?: string;
  /**
   * Slippage tolerance forwarded to every quote request as a decimal
   * (e.g. `0.02` = 2%). Withdrawals typically pass a higher value
   * (~2%) because the source token is a stablecoin and the buyer-side
   * cap is the platform balance, so a tighter quote can fail to clear
   * cross-chain liquidity. Omit to let the SDK apply its default.
   */
  slippage?: number;
  /**
   * Action verb that drives copy across the flow:
   *   "deposit" → "Review your deposit", "Confirm Deposit", "Deposit complete"
   *   "payment" → "Review your payment", "Confirm Payment", "Payment complete"
   *   "withdraw" → "Review your withdraw", "Confirm Withdraw", "Withdraw complete"
   * Defaults to "deposit". Any string is accepted; the widget capitalizes for
   * titles and uses a small gerund map (with `${mode}ing` fallback) for the
   * "you're {gerund}…" subtitle.
   */
  mode?: string;
  /**
   * Hide the "Destination" row on the review + loading screens. Default
   * false. Merchant checkout flows should set this — buyers don't care
   * (and shouldn't be confused by) the merchant's settlement vault
   * address. Deposit / withdraw flows generally leave it visible since
   * the destination there is the buyer's own embedded or external wallet.
   */
  hideDestination?: boolean;
  /**
   * Force the source → destination layout on the review screen even when the
   * picked token is identical to the destination token (direct transfers).
   * Default false.
   */
  alwaysShowRoute?: boolean;

  /** Fires once when the user submits the amount-picker screen. */
  onAmountSelected?: (amount: string) => void;
  /** Fires once after `flow.beginCheckout(...)` resolves with a transaction. */
  onTransactionCreated?: (tx: CheckoutTransaction) => void;
  /** Fires once when the review-quote display values become derivable. */
  onQuoteLocked?: (quote: ReviewQuote) => void;
  /** Fires on every step transition during submit / poll. */
  onExecutionUpdate?: (update: ExecutionUpdate) => void;
  /** Fires once when `flow.submit` resolves with a settled transaction. */
  onSettlementCompleted?: (tx: CheckoutTransaction) => void;
  /** Fires on user cancel / wallet rejection. */
  onCancelled?: () => void;
  /** Fires on non-rejection failures (network, SDK, etc.). */
  onError?: (err: Error) => void;
}

type Stage = "amount" | "review" | "processing" | "done";

/**
 * Map an action noun to its `-ing` form for "You're {gerund} with X" copy.
 * Irregular forms (payment→paying) are spelled out; arbitrary verbs fall
 * back to a naive `${noun}ing` suffix (handles deposit→depositing,
 * withdraw→withdrawing, send→sending; will be wrong for some edge verbs,
 * which hosts can fix by overriding via a future `labels` prop).
 */
function gerund(mode: string): string {
  const map: Record<string, string> = {
    deposit: "depositing",
    payment: "paying",
    withdraw: "withdrawing",
    send: "sending",
    transfer: "transferring",
  };
  return map[mode.toLowerCase()] ?? `${mode}ing`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PaymentWidget(props: PaymentWidgetProps): JSX.Element {
  const {
    createFlow,
    checkoutId,
    walletAccount,
    currency,
    destinationAddress,
    destinationChain,
    fromToken,
    destinationToken,
    needsConversion,
    isCrossChain,
    amount: initialAmount,
    presetAmounts,
    brand,
    memo,
    storageNamespace,
    slippage,
    mode = "deposit",
    hideDestination = false,
    alwaysShowRoute = false,
    onAmountSelected,
    onTransactionCreated,
    onQuoteLocked,
    onExecutionUpdate,
    onSettlementCompleted,
    onCancelled,
    onError,
  } = props;

  const [stage, setStage] = useState<Stage>(
    initialAmount ? "review" : "amount",
  );
  const [amount, setAmount] = useState<string>(initialAmount ?? "");
  const [steps, setSteps] = useState<TransactionStep[]>([]);

  const flow = useCheckoutFlow({ storageNamespace, slippage });

  // Fire-once gates
  const lockedFiredRef = useRef(false);
  const createdFiredRef = useRef(false);

  // Build a ReviewQuote view of the current quote for the host callback.
  const reviewQuote = useMemo(
    () => buildReviewQuote(flow.quote, fromToken, destinationToken),
    [flow.quote, fromToken, destinationToken],
  );

  // Fire onQuoteLocked the first time we can derive a ReviewQuote.
  useEffect(() => {
    if (reviewQuote && !lockedFiredRef.current) {
      lockedFiredRef.current = true;
      onQuoteLocked?.(reviewQuote);
    }
  }, [reviewQuote, onQuoteLocked]);

  // ---------------------------------------------------------------------------
  // beginCheckout when entering the review stage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (stage !== "review") return;
    if (createdFiredRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await flow.beginCheckout({
          amount,
          currency,
          createFlow,
          checkoutId,
          // Empty `destinationAddress` → omit the override entirely so the
          // Checkout's server-side `destinationConfig.destinations` is
          // used. Sending `[{ address: "" }]` here trips the API's
          // 18–100-char address pattern with a 400.
          ...(destinationAddress
            ? {
                destinationAddresses: [
                  // Dynamic's Chain enum on the SDK side is a string union; we keep
                  // the typing loose here since hosts pass the matching enum value.
                  {
                    address: destinationAddress,
                    chain: destinationChain as never,
                  },
                ],
              }
            : {}),
          memo,
          source: {
            fromAddress: walletAccount.address,
            // Source chain comes from the PICKED TOKEN, not from
            // the wallet's "active network."
            //
            // The SDK demo's pattern uses
            // `getActiveNetworkData({ walletAccount }).networkId`
            // — which works for EXTERNAL wallets (the user has
            // ONE active chain at any time in MetaMask/Phantom,
            // and the asset selector filters to tokens on that
            // chain). It DOESN'T work for WaaS EVM embedded
            // wallets: the wallet is multichain by design and the
            // SDK's "active network" defaults to Ethereum mainnet
            // (chainId 1) regardless of which chain the user
            // actually holds funds on. `switchActiveNetwork`
            // partially mitigates but doesn't always propagate
            // before this call site runs.
            //
            // `fromToken.chainId` is authoritative — the user (or
            // the host app) just explicitly picked this token, so
            // its chainId is unambiguously the source chain.
            fromChainId: String(fromToken.chainId),
            fromChainName: walletAccount.chain as never,
          },
          fromTokenAddress: fromToken.address,
        });
        if (cancelled || !result) return;
        createdFiredRef.current = true;
        onTransactionCreated?.(result.transaction);
      } catch (err) {
        if (!cancelled) onError?.(err as Error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally narrow deps: we only want to (re)fire beginCheckout when
    // the stage transitions into "review", not whenever any of the prop refs
    // change. Hosts should treat <PaymentWidget /> as a single mount per
    // checkout session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ---------------------------------------------------------------------------
  // Stage transitions
  // ---------------------------------------------------------------------------
  const handleAmountSubmit = useCallback(
    (value: string) => {
      setAmount(value);
      onAmountSelected?.(value);
      setStage("review");
    },
    [onAmountSelected],
  );

  const handleCancel = useCallback(() => {
    // Fire-and-forget; useCheckoutFlow swallows cancel-of-cancelled.
    // flow.cancel internally clears storage so the next mount doesn't restore
    // the cancelled transaction.
    void flow.cancel();
    onCancelled?.();
    // Host owns navigation on cancel — we don't flip our own stage here.
    // Flipping to "amount" would briefly render the picker during a host
    // transition animation, causing a visible flash. If a host wants to keep
    // PaymentWidget mounted after cancel, they should remount it with a new
    // key so the internal state machine restarts cleanly.
  }, [flow, onCancelled]);

  /**
   * Dismissal handler for TERMINAL-state screens (settlement complete
   * + failure). Unlike `handleCancel`, this does NOT call
   * `flow.cancel()` — the transaction is already in a terminal state
   * (settled or failed), and the cancel API would either be a no-op
   * or, worse, surface confusingly in the network tab as a "cancel
   * after settlement." Use `flow.reset()` so local state is cleared
   * for the next mount without the round-trip.
   */
  const handleDismiss = useCallback(() => {
    flow.reset();
    onCancelled?.();
  }, [flow, onCancelled]);

  const handleReviewConfirm = useCallback(async () => {
    if (!flow.quote) return;

    // Solana-only: re-fetch the quote right before submit. The
    // server bakes a Solana `recentBlockhash` into the
    // `signingPayload.serializedTransaction` returned from
    // `getCheckoutTransactionQuote`. Blockhashes expire in ~60–90s.
    // If the user lingered on the review screen, the initial
    // quote's transaction will fail simulation with "Blockhash not
    // found" during broadcast. Re-quoting yields a fresh
    // serializedTransaction with a current blockhash, dramatically
    // reducing the rate of stale-blockhash failures.
    //
    // We skip this on EVM because EVM transactions don't carry an
    // expiring blockhash — the extra round-trip just adds latency
    // on confirm with no benefit.
    if (isSolanaChainId(fromToken.chainId)) {
      const fresh = await flow.refreshQuote(fromToken.address);
      if (!fresh) {
        // `flow.error` is now set; the review screen will surface
        // it. Don't advance to processing.
        return;
      }
    }

    // Cross-chain EVM→SOL bridges (e.g. USDC on Base → USDC on Solana via
    // LiFi) still require an on-chain ERC-20 approval on the source chain.
    // The previous `!isCrossChain` guard wrongly skipped the approval step
    // for cross-chain flows, causing a totalSteps mismatch when the SDK
    // emitted onStepChange("approval").
    const needsApproval = needsConversion && !isSolanaChainId(fromToken.chainId);
    const initialSteps = generateTransactionSteps(
      mode,
      needsApproval,
      fromToken.symbol,
      destinationToken.symbol,
    );
    // totalSteps MUST equal initialSteps.length — the status-map uses it to
    // compute step indices for ExecutionUpdate. A mismatch (e.g. totalSteps=1
    // with 2 steps in the array) leaves later steps stuck in "pending" even
    // after the SDK reports completion, which is what made one-sided
    // (USDC→USDC) transactions look frozen.
    const totalSteps = initialSteps.length;
    setSteps(initialSteps);
    setStage("processing");

    const finalTx = await flow.submit({
      walletAccount,
      needsConversion,
      totalSteps,
      isCrossChain,
      onUpdate: (update) => {
        setSteps((prev) => updateTransactionSteps(prev, update));
        onExecutionUpdate?.(update);
      },
      onRejected: () => {
        setStage("review");
        onCancelled?.();
      },
      onError: () => {
        onError?.(new Error(flow.error ?? "Submit failed"));
      },
    });

    if (finalTx) {
      // Defense-in-depth: the hook already returns null on terminal
      // failures (BRIDGE_FAILED, expired, cancelled), but if a future
      // SDK change shifts the failure surface, double-check here so we
      // never call onSettlementCompleted for a tx that didn't actually
      // settle. Lands the user on the "done" stage so
      // TransactionProgressScreen renders FAILED + error + Retry.
      setStage("done");
      if (isFailedTerminal(finalTx)) {
        onError?.(new Error(extractFailureMessage(finalTx)));
        return;
      }
      onSettlementCompleted?.(finalTx);
    }
  }, [
    flow,
    mode,
    needsConversion,
    isCrossChain,
    fromToken.symbol,
    destinationToken.symbol,
    walletAccount,
    onExecutionUpdate,
    onCancelled,
    onError,
    onSettlementCompleted,
  ]);

  const handleRetry = useCallback(() => {
    // Clear flow state so the next entry into "review" refetches a fresh
    // quote (the existing one may be expired / failed). createdFiredRef
    // reset lets the beginCheckout effect fire again on stage change.
    flow.reset();
    createdFiredRef.current = false;
    lockedFiredRef.current = false;
    setStage("review");
  }, [flow]);

  // ---------------------------------------------------------------------------
  // Display values for ReviewPaymentScreen / TransactionProgressScreen
  // ---------------------------------------------------------------------------
  const paymentAmountNum = parseFloat(amount) || 0;

  const sourceDisplayAmount = useMemo(() => {
    // When the source and destination match (no swap/bridge), the SDK's
    // fromAmount can be unreliable for display — fall back to the user's
    // chosen amount in source units (stablecoin == 1:1 USD).
    if (!needsConversion) return amount || "0";
    if (!flow.quote?.quote) return amount || "0";
    return formatTokenDisplayAmount(
      flow.quote.quote.fromAmount,
      fromToken.decimals,
    );
  }, [needsConversion, flow.quote, fromToken.decimals, amount]);

  const destinationDisplayAmount = useMemo(() => {
    if (!flow.quote?.quote) return "0";
    return formatTokenDisplayAmount(
      flow.quote.quote.toAmount,
      destinationToken.decimals,
    );
  }, [flow.quote, destinationToken.decimals]);

  const feeUsd = getTotalFeeUsd(flow.quote);
  const totalUsd = paymentAmountNum + feeUsd;

  const sourceTokenInfo = buildTokenInfo(
    fromToken,
    sourceDisplayAmount,
    formatUsdSafe(totalUsd),
  );

  // Always build destinationTokenInfo so the completion screen can show the
  // hero amount even for same-token deposits (USDC→USDC etc.).
  // TokenConversionCard shows both sides when symbols OR chainIds differ,
  // supporting cross-chain same-token routes (e.g. USDC on Polygon → USDC on
  // Base via LI.FI).
  const destinationTokenInfo = buildTokenInfo(
    destinationToken,
    needsConversion ? destinationDisplayAmount : sourceDisplayAmount,
    formatUsdSafe(paymentAmountNum),
  );

  const itemTotalFee = {
    usd: formatUsdSafe(paymentAmountNum),
    token: `${sourceDisplayAmount} ${fromToken.symbol}`,
  };
  const networkFee = {
    usd: formatUsdSafe(feeUsd),
    token: formatUsdSafe(feeUsd),
  };
  const totalAmountFee = {
    usd: formatUsdSafe(totalUsd),
    token: `${sourceDisplayAmount} ${fromToken.symbol}`,
  };

  // ---------------------------------------------------------------------------
  // Brand styling
  // ---------------------------------------------------------------------------
  const brandStyle: CSSProperties = brand
    ? ({
        ["--brand-fg" as never]: brand.fg,
        ["--brand-muted" as never]: brand.muted,
        ["--brand-card-gradient-start" as never]: brand.cardGradientStart,
        ["--brand-card-gradient-end" as never]: brand.cardGradientEnd,
        ["--brand-radius" as never]: brand.radius,
      } as CSSProperties)
    : {};

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="checkouts-widget-root flex flex-col"
      style={brandStyle}
    >
      {stage === "amount" && (
        <DepositAmountScreen
          presets={presetAmounts}
          mode={mode}
          onConfirm={(value: number) => handleAmountSubmit(String(value))}
        />
      )}

      {stage === "review" && !flow.quote && (
        <div className="flex flex-col h-full flex-1">
          <ScreenHeader
            eyebrow={mode.toUpperCase()}
            title={`Review your ${mode}`}
            subtitle={
              needsConversion
                ? `You're ${gerund(mode)} ${formatUsdSafe(parseFloat(amount || "0"))} with ${fromToken.symbol}. We'll automatically convert it to ${destinationToken.symbol}.`
                : `You're ${gerund(mode)} ${formatUsdSafe(parseFloat(amount || "0"))} with ${fromToken.symbol}.`
            }
            onClose={handleCancel}
          />

          {flow.error && !flow.isLoading ? (
            <div className="flex flex-col flex-1 px-5 py-6 gap-4">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-red-50 px-4 py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-500">
                    <path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-red-800">
                  {flow.error}
                </p>
              </div>
              <div className="flex-1" />
              <div className="flex gap-[7px]">
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRetry}
                  className="flex-1"
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : (
          <>
          <div className="flex flex-col flex-1 animate-pulse">
            {/* Token card — same gradient + outer flex as TokenConversionCard.
              Each inner text bar sits in a leading wrapper (h-4 for text-xs,
              h-5 for text-sm) so vertical rhythm matches the rendered card. */}
            <div className="px-5 py-3 border-b border-(--brand-border)">
              {needsConversion ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 rounded-(--brand-radius) bg-gradient-to-r from-(--brand-card-gradient-start) to-(--brand-card-gradient-end)">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-gray-200" />
                      <div className="flex flex-col items-center text-center">
                        <div className="h-4 flex items-center">
                          <div className="h-3 w-12 bg-gray-200 rounded" />
                        </div>
                        <div className="h-5 flex items-center">
                          <div className="h-3.5 w-24 bg-gray-200 rounded" />
                        </div>
                        <div className="h-4 flex items-center">
                          <div className="h-3 w-10 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-4 h-4 flex items-center justify-center shrink-0 text-(--brand-muted)">
                    <ArrowRightIcon />
                  </div>
                  <div className="flex-1 p-3 rounded-(--brand-radius) bg-gradient-to-l from-(--brand-card-gradient-start) to-(--brand-card-gradient-end)">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-gray-200" />
                      <div className="flex flex-col items-center text-center">
                        <div className="h-4 flex items-center">
                          <div className="h-3 w-12 bg-gray-200 rounded" />
                        </div>
                        <div className="h-5 flex items-center">
                          <div className="h-3.5 w-24 bg-gray-200 rounded" />
                        </div>
                        <div className="h-4 flex items-center">
                          <div className="h-3 w-10 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-(--brand-radius) bg-gradient-to-b from-(--brand-card-gradient-start) to-(--brand-card-gradient-end)">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-gray-200" />
                    <div className="flex flex-col items-center text-center">
                      <div className="h-4 flex items-center">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                      </div>
                      <div className="h-5 flex items-center">
                        <div className="h-3.5 w-28 bg-gray-200 rounded" />
                      </div>
                      <div className="h-4 flex items-center">
                        <div className="h-3 w-12 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Destination row — real label, placeholder bar for the value */}
            {!hideDestination && (
              <div className="px-5 py-3 border-b border-(--brand-border)">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
                    Destination
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-gray-200" />
                    <div className="h-[18px] flex items-center">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fee breakdown — real labels (Item total / Fee / Total), placeholder
              bars only for the values since those need the quote to compute. */}
            <div className="px-5 py-3 border-b border-(--brand-border)">
              <div className="flex flex-col gap-[7px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
                    Item total
                  </span>
                  <div className="h-[18px] flex items-center">
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
                    Fee
                  </span>
                  <div className="h-[18px] flex items-center">
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="border-t border-dashed border-(--brand-border)" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-(--brand-muted) tracking-[-0.12px] leading-[18px]">
                    Total
                  </span>
                  <div className="h-[18px] flex items-center">
                    <div className="h-3.5 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Spacer — same pattern as the real review screen */}
            <div className="flex-1" />
          </div>

          {/* Footer — real, enabled Back button so the user can cancel during
              the quote fetch; right placeholder mirrors the disabled Confirm
              button shape with the spinner + Getting quote… inline. */}
          <div className="flex gap-[7px] px-5 py-3">
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="flex-1"
            >
              Back
            </Button>
            <div className="flex-1 h-9 rounded-lg bg-gray-300 flex items-center justify-center gap-2 animate-pulse">
              <div className="w-3 h-3 border-2 border-(--brand-muted) border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-(--brand-muted)">Getting quote…</p>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {stage === "review" && flow.quote && (
        <ReviewPaymentScreen
          mode={mode}
          sourceToken={sourceTokenInfo}
          destinationToken={destinationTokenInfo}
          destinationAddress={hideDestination ? undefined : destinationAddress}
          alwaysShowRoute={alwaysShowRoute}
          itemTotal={itemTotalFee}
          networkFee={networkFee}
          totalAmount={totalAmountFee}
          isExecuting={flow.isLoading}
          error={flow.error}
          onBack={handleCancel}
          onClose={handleCancel}
          onConfirm={handleReviewConfirm}
          onClearError={handleRetry}
        />
      )}

      {(stage === "processing" || stage === "done") && (
        <TransactionProgressScreen
          mode={mode}
          sourceToken={sourceTokenInfo}
          destinationToken={destinationTokenInfo}
          alwaysShowRoute={alwaysShowRoute}
          steps={steps}
          error={flow.error}
          // `onClose` only renders for terminal states (done +
          // failed) — the X is hidden during the processing stage.
          // We use `handleDismiss` here instead of `handleCancel`
          // because the transaction is already settled/failed by
          // the time this button is reachable; calling the cancel
          // API on a resolved transaction is the bug that surfaces
          // as "I pressed Done and it called cancel."
          onClose={handleDismiss}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
