"use client";

/**
 * <CheckoutWidget />
 *
 * Batteries-included top-level widget for the standard checkout flow:
 *
 *   connect a wallet → pick a token → run the payment
 *
 * Owns the screen transitions, the wallet de-dup listener (so the
 * SDK's `walletAccountsChanged` firehose doesn't re-mount the picker
 * on every tick), and the TokenAsset → Token transform. Mounts inside
 * a `<WidgetCard>` with `<PoweredByFooter />` chrome.
 *
 * For hosts that need custom screens (exchange-OAuth wallets, social
 * login, custom asset discovery) the leaf screens — `WalletPickerScreen`,
 * `AssetSelectorScreen`, `PaymentWidget` — are still exported and can
 * be composed directly. `<CheckoutWidget>` is the standard path; the
 * leaf screens are the escape hatch.
 *
 * @example
 * ```tsx
 * <CheckoutWidget
 *   checkoutId="ck_..."
 *   destinationToken={USDC_BASE}
 *   destinationAddress="0xabc..."
 *   destinationChain="EVM"
 *   currency="USD"
 *   amount="10.00"
 *   mode="payment"
 *   hideDestination
 *   verifyOnConnect={false}
 *   onSettlementCompleted={(tx) => router.push(`/receipt/${tx.id}`)}
 * />
 * ```
 */

import { useEffect, useState, type JSX, type ReactNode } from "react";
import {
  getPrimaryWalletAccount,
  offEvent,
  onEvent,
  type WalletAccount,
} from "@dynamic-labs-sdk/client";
import { PoweredByFooter, WidgetCard } from "@dynamic-demos/ui";

import AssetSelectorScreen from "./components/asset-selector-screen";
import DepositAmountScreen from "./components/deposit-amount-screen";
import WalletPickerScreen from "./components/wallet-picker-screen";
import { PaymentWidget } from "./PaymentWidget";
import type { TokenAsset } from "./lib/balance-utils";
import { ZERO_ADDRESS } from "./lib/chain";
import { truncateAddress } from "./lib/format";
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

export interface CheckoutWidgetProps {
  // ---------------------------------------------------------------------------
  // Payment config — passed through to <PaymentWidget />.
  // ---------------------------------------------------------------------------
  /** Dynamic Checkout id. */
  checkoutId: string;
  /** Settlement token the destination receives. */
  destinationToken: Token;
  /** Destination address that receives the settlement token. */
  destinationAddress: string;
  /** Destination chain identifier (Dynamic `Chain` enum, e.g. "EVM"). */
  destinationChain: string;
  /** ISO currency code for the payment amount (e.g. "USD"). */
  currency: string;
  /** If supplied, skips the amount picker and starts at review. */
  amount?: string;
  /** Preset amounts to show on the amount picker (defaults provided). */
  presetAmounts?: number[];
  /**
   * Minimum amount accepted by the amount-first picker (USD). Pass
   * `0.10` for low-value demo testing; default is the
   * `<DepositAmountScreen>` default ($1). Only applied when the
   * amount-first pre-stage renders.
   */
  minAmount?: number;
  /**
   * Maximum amount accepted by the amount-first picker (USD).
   * Defaults to the `<DepositAmountScreen>` default ($10,000).
   */
  maxAmount?: number;
  /**
   * Ask the user for an amount BEFORE wallet selection. Default
   * `false`. Useful for deposit / withdraw flows where the user
   * thinks "how much do I want to move?" before "what token?". The
   * chosen amount is threaded into `<PaymentWidget>` so its internal
   * amount stage is skipped.
   *
   * Ignored if `amount` is supplied (the host already knows the
   * amount).
   */
  amountFirst?: boolean;
  /** Brand tokens applied as CSS variables on the widget root. */
  brand?: BrandConfig;
  /** Opaque host-provided metadata forwarded into transaction creation. */
  memo?: Record<string, unknown>;
  /** Namespace for in-flight transaction persistence in localStorage. */
  storageNamespace?: string;
  /** Action verb that drives copy ("payment" | "deposit" | "withdraw" | …). */
  mode?: string;
  /**
   * Hide the "Destination" row on the review + loading screens. Default
   * `false`. Merchant checkout flows should set this — buyers don't care
   * (and shouldn't be confused by) the merchant's settlement vault.
   */
  hideDestination?: boolean;

  // ---------------------------------------------------------------------------
  // Wallet picker config — passed through to <WalletPickerScreen />.
  // ---------------------------------------------------------------------------
  /**
   * Pre-supplied connected wallet. When set, the widget skips its
   * own connect stage and starts directly at the amount-first
   * picker (if `amountFirst`) or the token picker. Useful when the
   * host already authenticated the user — e.g. a "platform shell"
   * mounting a deposit flow for an already-connected embedded
   * wallet — and doesn't want to re-prompt for a wallet.
   */
  walletAccount?: WalletAccount;
  /** Pre-select this chain in multi-chain groups. Default "EVM". */
  preferredChain?: string;
  /**
   * SIWE challenge on connect. Default `true`. Set `false` for buyer-side
   * flows where the next step (signing the payment tx) is already a
   * signature challenge — see `WalletPickerScreen.verifyOnConnect`.
   */
  verifyOnConnect?: boolean;
  /** Optional override for the wallet picker's eyebrow / title block. */
  walletPickerHeader?: ReactNode;
  /** Optional content above the installed-wallets list. */
  walletPickerExtrasBefore?: ReactNode;
  /** Optional content below the installed list, above "Show more". */
  walletPickerExtrasAfter?: ReactNode;

  // ---------------------------------------------------------------------------
  // Asset selector config — passed through to <AssetSelectorScreen />.
  // ---------------------------------------------------------------------------
  /** Hide tokens whose USD value falls below this. Default 0. */
  minUsdValue?: number;
  /** Approximate row count before the token list scrolls. Default 5. */
  initialTokensShown?: number;
  /**
   * Override the asset selector's default header. Receives the connected
   * `wallet`, a `goBack` callback (resets to wallet picker), and — when
   * an amount is known (either via the `amount` prop or captured by
   * `amountFirst`) — the formatted amount + mode so custom headers can
   * display the deposit target.
   */
  assetSelectorHeader?: (args: {
    wallet: WalletAccount;
    goBack: () => void;
    mode: string;
    amount?: string;
    currency: string;
  }) => ReactNode;

  // ---------------------------------------------------------------------------
  // Lifecycle callbacks — forwarded from <PaymentWidget />.
  // ---------------------------------------------------------------------------
  onAmountSelected?: (amount: string) => void;
  onTransactionCreated?: (tx: CheckoutTransaction) => void;
  onQuoteLocked?: (quote: ReviewQuote) => void;
  onExecutionUpdate?: (update: ExecutionUpdate) => void;
  onSettlementCompleted?: (tx: CheckoutTransaction) => void;
  /** Fires when the buyer aborts (PaymentWidget back/X). The widget
   *  itself flips back to the asset picker so the buyer can pick a
   *  different token without unmounting. */
  onCancelled?: () => void;
  onError?: (err: Error) => void;

  // ---------------------------------------------------------------------------
  // Chrome
  // ---------------------------------------------------------------------------
  /** Hide the "Powered by Dynamic" footer beneath the card. Default false. */
  hidePoweredBy?: boolean;
  /**
   * Hide the Terms + Privacy footer links beneath the card. Default
   * false — checkout / deposit / withdraw flows surface Dynamic's
   * legal terms by default because the buyer is signing a transaction
   * on Dynamic's rails.
   */
  hideLegalLinks?: boolean;
  /**
   * Override the legal links rendered beneath the widget. Defaults to
   * Dynamic's terms + privacy URLs. Pass an empty array to render
   * none (or just set `hideLegalLinks`).
   */
  legalLinks?: Array<{ label: string; href: string }>;
  /** Extra classes for the outer container. */
  className?: string;
}

const DEFAULT_LEGAL_LINKS: Array<{ label: string; href: string }> = [
  {
    label: "Terms of Service",
    href: "https://www.dynamic.xyz/terms-conditions",
  },
  {
    label: "Privacy Policy",
    href: "https://www.dynamic.xyz/privacy-policy",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function CheckoutWidget(props: CheckoutWidgetProps): JSX.Element {
  const {
    checkoutId,
    destinationToken,
    destinationAddress,
    destinationChain,
    currency,
    amount,
    presetAmounts,
    minAmount,
    maxAmount,
    amountFirst = false,
    brand,
    memo,
    storageNamespace,
    mode = "payment",
    hideDestination = false,
    walletAccount: walletAccountProp,
    preferredChain = "EVM",
    verifyOnConnect = true,
    walletPickerHeader,
    walletPickerExtrasBefore,
    walletPickerExtrasAfter,
    minUsdValue = 0,
    initialTokensShown = 5,
    assetSelectorHeader,
    onAmountSelected,
    onTransactionCreated,
    onQuoteLocked,
    onExecutionUpdate,
    onSettlementCompleted,
    onCancelled,
    onError,
    hidePoweredBy = false,
    hideLegalLinks = false,
    legalLinks = DEFAULT_LEGAL_LINKS,
    className,
  } = props;

  // Host-supplied wallet takes precedence over internal picker state.
  // When `walletAccountProp` is set the picker stage is skipped
  // entirely — the host already authenticated the user. Otherwise
  // `pickedWallet` holds whatever the embedded WalletPickerScreen
  // returned. Read via the merged `wallet` everywhere; write via
  // `setPickedWallet` (the host's prop is the source of truth, so
  // attempts to clear it locally are no-ops in the picker stage).
  const [pickedWallet, setPickedWallet] = useState<WalletAccount | null>(null);
  const wallet = walletAccountProp ?? pickedWallet;
  const [fromToken, setFromToken] = useState<Token | null>(null);
  // Amount captured BEFORE wallet selection when `amountFirst` is on.
  // When the host supplies `amount` directly we don't need this stage
  // at all, so the state starts populated with the host value.
  const [enteredAmount, setEnteredAmount] = useState<string | null>(
    amount ?? null,
  );
  // `amountFirst` is meaningful only when the host hasn't already
  // supplied a fixed `amount`. If both are passed, host's `amount`
  // wins and we skip the pre-stage.
  const showAmountStage = amountFirst && !amount && enteredAmount === null;

  // The effective amount we're transacting. Host-supplied wins; falls
  // back to whatever the amount stage captured. Used to (a) seed
  // PaymentWidget so it skips its own amount picker, (b) display in
  // the asset-selector header, and (c) raise the token-list filter
  // floor so the user only sees tokens whose USD value clears the
  // amount they're trying to move.
  const effectiveAmount: string | undefined =
    amount ?? enteredAmount ?? undefined;
  const effectiveAmountNumber: number = effectiveAmount
    ? parseFloat(effectiveAmount)
    : 0;
  const effectiveMinUsdValue = Math.max(
    minUsdValue,
    Number.isFinite(effectiveAmountNumber) ? effectiveAmountNumber : 0,
  );

  // The SDK returns a fresh wallet object reference on every read; de-dup
  // by `.address` to avoid re-rendering downstream screens on every
  // `walletAccountsChanged` tick (which fires often during SDK init).
  // Without this the asset picker re-mounts in a loop and the cursor
  // flickers between pointer/default as buttons swap in and out.
  useEffect(() => {
    const apply = (next: WalletAccount | null) => {
      setPickedWallet((prev) => {
        if (prev?.address === next?.address) return prev;
        return next;
      });
    };
    apply(getPrimaryWalletAccount());
    const listener = () => apply(getPrimaryWalletAccount());
    onEvent({ event: "walletAccountsChanged", listener });
    return () => {
      offEvent({ event: "walletAccountsChanged", listener });
    };
  }, []);

  // Swap flags computed from the picked token vs the settlement asset.
  // Same chain id + same address = direct transfer; anything else flips
  // `needsConversion` (and `isCrossChain` when chain ids differ).
  const needsConversion =
    !!fromToken &&
    (fromToken.address.toLowerCase() !==
      destinationToken.address.toLowerCase() ||
      fromToken.chainId !== destinationToken.chainId);
  const isCrossChain =
    !!fromToken && fromToken.chainId !== destinationToken.chainId;

  function handleTokenSelected(asset: TokenAsset) {
    setFromToken({
      // Native tokens have no contract address — Dynamic's SDK
      // expects the zero address as the native-token sentinel on
      // both EVM and SOL (`getSwapQuote.d.ts`: "Use zero address
      // for EVM and SOL native tokens."). Send it explicitly rather
      // than passing an empty string and relying on undocumented
      // upstream normalization.
      address: asset.tokenAddress ?? ZERO_ADDRESS,
      chainId: asset.chainId,
      symbol: asset.symbol,
      decimals: asset.decimals,
      name: asset.name,
      logoURI: asset.iconUrl,
    });
  }

  function handlePaymentCancelled() {
    // Flip back to the asset picker so the buyer can pick a different
    // token without unmounting the widget. The host can still subscribe
    // via the `onCancelled` callback for analytics or navigation.
    setFromToken(null);
    onCancelled?.();
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <WidgetCard className="overflow-hidden">
        {showAmountStage ? (
          <DepositAmountScreen
            mode={mode}
            presets={presetAmounts}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onConfirm={(value) => {
              setEnteredAmount(String(value));
              onAmountSelected?.(String(value));
            }}
          />
        ) : !wallet ? (
          <div className="px-5 py-5">
            <WalletPickerScreen
              onConnected={setPickedWallet}
              preferredChain={preferredChain}
              verifyOnConnect={verifyOnConnect}
              header={walletPickerHeader ?? <DefaultWalletPickerHeader />}
              extrasBefore={walletPickerExtrasBefore}
              extrasAfter={walletPickerExtrasAfter}
            />
          </div>
        ) : !fromToken ? (
          <div className="px-5 py-5">
            <AssetSelectorScreen
              walletAccount={wallet}
              onSelected={handleTokenSelected}
              minUsdValue={effectiveMinUsdValue}
              initialTokensShown={initialTokensShown}
              header={
                assetSelectorHeader
                  ? assetSelectorHeader({
                      wallet,
                      goBack: () => setPickedWallet(null),
                      mode,
                      amount: effectiveAmount,
                      currency,
                    })
                  : (
                    <DefaultAssetSelectorHeader
                      wallet={wallet}
                      onChangeWallet={() => setPickedWallet(null)}
                      mode={mode}
                      amount={effectiveAmount}
                      currency={currency}
                    />
                  )
              }
            />
          </div>
        ) : (
          <PaymentWidget
            // Re-key on the picked token so the widget's internal state
            // machine restarts cleanly when the buyer backs out + picks
            // again.
            key={`${fromToken.chainId}-${fromToken.address || fromToken.symbol}`}
            checkoutId={checkoutId}
            walletAccount={wallet}
            currency={currency}
            destinationAddress={destinationAddress}
            destinationChain={destinationChain}
            fromToken={fromToken}
            destinationToken={destinationToken}
            needsConversion={needsConversion}
            isCrossChain={isCrossChain}
            mode={mode}
            // If the host supplied a fixed `amount` use it; otherwise
            // fall through to whatever the pre-stage captured (when
            // `amountFirst` was on) — leaves PaymentWidget's own
            // amount picker as the third fallback for default flows.
            amount={amount ?? enteredAmount ?? undefined}
            presetAmounts={presetAmounts}
            brand={brand}
            memo={memo}
            storageNamespace={storageNamespace}
            hideDestination={hideDestination}
            onAmountSelected={onAmountSelected}
            onTransactionCreated={onTransactionCreated}
            onQuoteLocked={onQuoteLocked}
            onExecutionUpdate={onExecutionUpdate}
            onSettlementCompleted={onSettlementCompleted}
            onCancelled={handlePaymentCancelled}
            onError={onError}
          />
        )}
      </WidgetCard>
      {/* Legal disclosure sits ABOVE the Powered-by mark — the buyer
          reads "by continuing, you agree to ..." first, then the
          attribution. */}
      {!hideLegalLinks && legalLinks.length > 0 && (
        <LegalLinks links={legalLinks} />
      )}
      {!hidePoweredBy && <PoweredByFooter />}
    </div>
  );
}

function LegalLinks({
  links,
}: {
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <p
      aria-label="Legal"
      className="mt-1 text-center text-xs leading-relaxed text-[var(--brand-muted,#99a0ae)]"
    >
      By continuing, you agree to our{" "}
      {links.map((link, i) => (
        <span key={link.href}>
          {i > 0 && (i === links.length - 1 ? " and " : ", ")}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[var(--brand-fg,#0e121b)] transition-colors"
          >
            {link.label}
          </a>
        </span>
      ))}
      .
    </p>
  );
}

// =============================================================================
// Default headers — hosts can override via props.
// =============================================================================

function DefaultWalletPickerHeader() {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-muted,#99a0ae)] font-medium">
        Connect a wallet
      </span>
      <h3 className="text-base font-semibold text-[var(--brand-fg,#0e121b)] tracking-[-0.01em]">
        Pick how you&apos;ll pay
      </h3>
    </div>
  );
}

function DefaultAssetSelectorHeader({
  wallet,
  onChangeWallet,
  mode,
  amount,
  currency,
}: {
  wallet: WalletAccount;
  onChangeWallet: () => void;
  mode: string;
  amount?: string;
  currency: string;
}) {
  // Eyebrow tracks the current scenario mode: "DEPOSIT $25",
  // "PAYMENT $0.10", "WITHDRAW $100" when the amount is known; just
  // "DEPOSIT" / "PAYMENT" / "WITHDRAW" when it isn't. Matches the
  // mode-based eyebrows the review + processing screens use, so all
  // headers across the widget read with the same vocabulary.
  const formattedAmount = formatAmountForEyebrow(amount, currency);
  const eyebrow = formattedAmount ? `${mode} ${formattedAmount}` : mode;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--brand-muted,#99a0ae)] font-medium">
          {eyebrow}
        </span>
        <h3 className="text-base font-semibold text-[var(--brand-fg,#0e121b)] tracking-[-0.01em]">
          Pick a token
        </h3>
      </div>
      <button
        type="button"
        onClick={onChangeWallet}
        aria-label={`Change wallet (connected: ${truncateAddress(wallet.address)})`}
        title="Change wallet"
        className="inline-flex items-center gap-1.5 self-end rounded-full border border-[var(--brand-border,#e1e4ea)] bg-[var(--brand-surface,#ffffff)] pl-2.5 pr-2 py-1 text-[11px] font-mono text-[var(--brand-muted,#99a0ae)] hover:text-[var(--brand-fg,#0e121b)] hover:bg-[var(--brand-row-hover,#f4f5f7)] transition-colors [&_*]:pointer-events-none"
      >
        <span>{truncateAddress(wallet.address)}</span>
        <SwapGlyph />
      </button>
    </div>
  );
}

function SwapGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="block"
    >
      <path
        d="M3 4h8m0 0L9 2m2 2L9 6M11 10H3m0 0l2-2m-2 2l2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =============================================================================
// Tiny utility — keep this module from depending on @dynamic-demos/utils
// purely for `cn`. Class merging here is trivial (string concat with
// whitespace) so we inline.
// =============================================================================

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format the captured amount for the asset-selector eyebrow.
 * Strips a trailing `.00` for cleaner display ("DEPOSIT $25" vs
 * "DEPOSIT $25.00") and uses `Intl.NumberFormat` so non-USD currencies
 * format correctly too. Returns `null` when the amount can't be
 * parsed — caller falls back to a generic eyebrow.
 */
function formatAmountForEyebrow(
  amount: string | undefined,
  currency: string,
): string | null {
  if (!amount) return null;
  const n = parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Unknown currency code; fall back to a `$` prefix.
    return `$${n}`;
  }
}
