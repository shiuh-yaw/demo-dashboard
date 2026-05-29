"use client";

/**
 * Deposit sub-flow inside the withdraw demo's platform shell —
 * bridges funds INTO the embedded SOL wallet.
 *
 * Two wallets, two roles:
 *   sourceWalletAccount   — external auth wallet (Phantom/MetaMask/etc.).
 *                           Pre-supplied as CheckoutWidget.walletAccount so
 *                           the widget skips its own picker and reads the
 *                           user's real on-chain balances as source assets.
 *                           If null (edge case — user reached deposit
 *                           without going through the picker), the
 *                           CheckoutWidget shows its picker and lets the
 *                           user re-connect.
 *   destinationAddress    — the embedded SOL wallet's address. Funds
 *                           settle here as USDC on Solana, regardless of
 *                           which chain/asset the user paid with.
 *
 * ## Per-deposit Checkout minting
 *
 * Unlike `/checkout` and `/deposit` (the standalone routes — destination
 * is a fixed merchant/platform vault, so they reuse one pre-baked
 * Checkout id), the deposit destination here varies per user: it's the
 * user-specific embedded SOL wallet address we provisioned on connect.
 *
 * Server-side Checkout config is the source of truth at settle time —
 * passing a client-side `destinationAddress` prop with a mismatched
 * pre-baked Checkout would silently misroute funds to whatever the
 * pre-baked Checkout's destination is. So we mint a fresh Checkout
 * server-side on subflow mount via `POST /api/checkouts` (the same
 * route `/withdraw` uses) with `mode: "deposit"` and the embedded
 * wallet's SOL address as the destination.
 *
 * Lifecycle: creating → ready (or error → retry → creating).
 *
 * Dynamic Flow handles the swap/bridge from any source asset on any
 * supported source chain to USDC on Solana — so the user can deposit
 * from MetaMask on Base, Phantom on Solana, Fireblocks on Polygon,
 * etc., and the embedded wallet receives USDC.
 */

import { CheckoutWidget } from "@dynamic-demos/checkouts-widget";
import { WidgetCard } from "@dynamic-demos/ui";
import type { WalletAccount } from "@/lib/dynamic/flow-sdk";
import { USDC_ON_SOLANA } from "../settlement-options";
import { CreatingFlowPanel, FlowErrorPanel } from "./sub-flow-chrome";
import { useCheckoutMinting } from "../use-checkout-minting";

export function DepositSubFlow({
  sourceWalletAccount,
  destinationAddress,
  onDone,
}: {
  sourceWalletAccount: WalletAccount | null;
  destinationAddress: string;
  onDone: () => void;
}) {
  // Mint on mount — destinationAddress is the embedded wallet's
  // address, known up-front, so `enabled` is unconditionally true.
  const { checkoutId, error, retry } = useCheckoutMinting({
    enabled: true,
    mode: "deposit",
    destinationAddress,
    // Platform wallet is anchored on Solana — the destination address
    // is a Solana base58 string, and we settle USDC on Solana mainnet.
    // These two together drive the upstream Checkout's `destinations`
    // entry (chainName=SOL) and settlement config (USDC@solana).
    destinationChain: "SOL",
    asset: "USDC",
    chain: "solana",
  });

  // Error stage — surface a retry button. Same panel shape as
  // WithdrawSubFlow's FlowErrorPanel for visual consistency.
  // Wrap in WidgetCard because AuthenticatedShell's deposit branch
  // intentionally bypasses the outer card (so the ready-stage
  // CheckoutWidget doesn't double-card), and these intermediate
  // panels need card chrome to look right.
  if (error) {
    return (
      <WidgetCard className="overflow-hidden">
        <FlowErrorPanel message={error} onRetry={retry} onBack={onDone} />
      </WidgetCard>
    );
  }

  // Creating stage — short server roundtrip (~200ms typical) before
  // the CheckoutWidget mounts. Same spinner shape as the withdraw
  // flow's CreatingFlowPanel for consistency.
  if (!checkoutId) {
    return (
      <WidgetCard className="overflow-hidden">
        <CreatingFlowPanel mode="deposit" />
      </WidgetCard>
    );
  }

  // Ready stage — CheckoutWidget brings its own WidgetCard chrome,
  // and the platform shell intentionally bypasses its outer card for
  // this branch (see AuthenticatedShell). When sourceWalletAccount
  // is null we pass undefined so the widget falls back to its own
  // picker (defensive — normal flow always provides one).
  return (
    <CheckoutWidget
      walletAccount={sourceWalletAccount ?? undefined}
      checkoutId={checkoutId}
      destinationToken={USDC_ON_SOLANA}
      destinationAddress={destinationAddress}
      // Threads into `createCheckoutTransaction({ destinationAddresses:
      // [{ address, chain }] })`, which the SDK serializes as
      // `chainName` on the wire. Must match the chain family of the
      // address — Solana base58 → "SOL", EVM 0x… → "EVM".
      destinationChain="SOL"
      currency="USD"
      mode="deposit"
      amountFirst
      // Dynamic's cross-chain routing engine returns no quotes
      // ("USDC@SOL-101: unknown") when the trade is too small for
      // bridge providers (gas + fees exceed the principal). $1 is
      // the practical floor for EVM→SOL routes. Withdrawals from
      // the embedded wallet stay below this because they're
      // typically same-chain transfers, not bridged swaps.
      minAmount={1}
      presetAmounts={[25, 50, 100, 250]}
      // The platform shell renders its own legal footer once at the
      // outer level; suppress the per-widget copy to avoid duplication.
      hidePoweredBy
      hideLegalLinks
      // No `onSettlementCompleted` callback: let the widget render its
      // own success screen instead of unmounting it. User dismisses via
      // the widget's X (back to form) or the shell's "Back to platform".
    />
  );
}
