"use client";

/**
 * Post-auth shell — owns the balance hook and routes between
 * Dashboard / DepositSubFlow / WithdrawSubFlow with the USDC balance
 * + loading flag piped down to each consumer.
 *
 * Mounted only after the embedded wallet is provisioned, so the
 * balance hook is safe to call unconditionally (Rules of Hooks).
 */

import { useMemo, useState } from "react";
import { WidgetCard } from "@dynamic-demos/ui";
import { BackButton } from "@/components/back-button";
import type { WalletAccount } from "@/lib/dynamic/flow-sdk";
import { Dashboard } from "./dashboard";
import { DepositSubFlow } from "./deposit-subflow";
import { useEmbeddedWalletBalances } from "../use-embedded-wallet-balances";
import { WithdrawSubFlow } from "./withdraw-subflow";

type ShellFlow = "dashboard" | "deposit" | "withdraw";

export function AuthenticatedShell({
  walletAccount,
  externalWalletAccount,
  onLeavePlatform,
}: {
  /** Embedded SOL WaaS wallet — platform identity. */
  walletAccount: WalletAccount;
  /**
   * External wallet (Phantom/MetaMask/Fireblocks/...) the user signed
   * in through. Used as the source of funds for the deposit subflow.
   * May be null if the user somehow reached this state without going
   * through the picker (e.g. SSR/hydration races); in that case the
   * deposit flow falls back to letting the user pick a wallet inside
   * the CheckoutWidget.
   */
  externalWalletAccount: WalletAccount | null;
  onLeavePlatform: () => void;
}) {
  const [flow, setFlow] = useState<ShellFlow>("dashboard");

  // Run once, share across Dashboard + WithdrawSubFlow (which needs
  // it for the Max button on the amount input). The Dashboard's
  // refresh button calls `refetch({ force: true })` to bypass the
  // SDK's cache.
  const {
    tokens,
    loading: balanceLoading,
    refetch: refetchBalances,
  } = useEmbeddedWalletBalances(walletAccount);

  // USDC-only balance — the demo's framing is "we only accept USDC
  // here", so we collapse all USDC into a single figure.
  // `marketValue` on `TokenBalance` is already a number (USD); no
  // string parsing needed.
  const usdcBalanceUsd = useMemo(() => {
    if (!tokens) return 0;
    return tokens
      .filter((t) => t.symbol === "USDC")
      .reduce((sum, t) => sum + (t.marketValue ?? 0), 0);
  }, [tokens]);

  const inSubFlow = flow !== "dashboard";
  const handleTopBack = () => {
    if (inSubFlow) {
      setFlow("dashboard");
    } else {
      onLeavePlatform();
    }
  };
  const topBackLabel = inSubFlow ? "Back to wallet" : "Back to platform";

  // Deposit subflow mounts <CheckoutWidget>, which already wraps its
  // own <WidgetCard>. Rendering it inside the platform's outer
  // WidgetCard would nest cards (border-inside-border). Branch out
  // and render the deposit subflow standalone.
  if (flow === "deposit") {
    return (
      <div className="flex flex-col gap-2">
        <BackButton onClick={handleTopBack} label={topBackLabel} />
        <DepositSubFlow
          sourceWalletAccount={externalWalletAccount}
          destinationAddress={walletAccount.address}
          onDone={() => setFlow("dashboard")}
        />
      </div>
    );
  }

  const body =
    flow === "withdraw" ? (
      <WithdrawSubFlow
        walletAccount={walletAccount}
        usdcBalanceUsd={usdcBalanceUsd}
        balanceLoading={balanceLoading}
        onDone={() => setFlow("dashboard")}
      />
    ) : (
      <Dashboard
        walletAccount={walletAccount}
        usdcBalanceUsd={usdcBalanceUsd}
        loading={balanceLoading}
        onRefresh={() => {
          void refetchBalances({ force: true });
        }}
        onDeposit={() => setFlow("deposit")}
        onWithdraw={() => setFlow("withdraw")}
      />
    );

  return (
    <div className="flex flex-col gap-2">
      <BackButton onClick={handleTopBack} label={topBackLabel} />
      <WidgetCard className="overflow-hidden">{body}</WidgetCard>
    </div>
  );
}
