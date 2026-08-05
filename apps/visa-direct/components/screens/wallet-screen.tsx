"use client";

/**
 * My wallet screen.
 *
 * Showcase page for what the host can do with their embedded USDC
 * wallet once Visa Direct has pushed earnings into it — send,
 * receive, and park idle funds in yield. Complements the existing
 * payout-methods (configuration) and transactions (history) screens
 * by adding a third "use it" surface that makes the demo feel like a
 * real wallet, not just a payout destination.
 *
 * Only meaningful for embedded wallets. CeFi (BYO) wallets are
 * external so we can't sign for them here — we render a clear empty
 * state that points the user at their exchange instead.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  RefreshCw,
  Repeat2,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { cn } from "@dynamic-demos/utils";
import { SendUsdcModal } from "@/components/screens/send-usdc-modal";
import { YieldModal } from "@/components/screens/yield-modal";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useUSDCBalance } from "@/hooks/use-usdc-balance";
import {
  useYieldPositions,
  type YieldStrategy,
} from "@/hooks/use-yield-positions";
import { usePayoutContext } from "@/contexts/payout-context";
import { useExternalWalletLabel } from "@/hooks/use-external-wallet-label";
import { EXTERNAL_WALLET_PROVIDER_PREFIX } from "@/components/screens/connect-external-wallet-modal";
import { getExchangeDisplay } from "@/lib/exchanges-registry";
import { SimulatePayoutButton } from "@/components/dashboard/simulate-payout-button";
import { truncateAddress } from "@/lib/format";

/**
 * Public Sepolia RPC nodes can lag the bundler's receipt by a few
 * seconds — an immediate refetch right after the UserOp lands can
 * still return the pre-send balance. We invalidate once immediately
 * and once after this delay as cheap second pass.
 */
const BALANCE_REFETCH_FOLLOWUP_MS = 4000;

export function WalletScreen() {
  const { walletAddress, walletProvider } = usePayoutContext();
  const { networkLabel } = useActiveNetwork();
  const externalWalletLabel = useExternalWalletLabel(walletProvider);
  const queryClient = useQueryClient();

  // Embedded wallets are the only ones we can sign for here. For CeFi
  // wallets we still query nothing and render the "connect embedded"
  // empty state further down.
  const isEmbedded = walletProvider === "embedded";

  const usdcBalance = useUSDCBalance(isEmbedded ? walletAddress : null);
  const { strategies, positions, totalDeposited, withdraw } =
    useYieldPositions();

  const [sendOpen, setSendOpen] = useState(false);
  const [yieldOpen, setYieldOpen] = useState(false);

  // After a successful send, refresh every surface showing the USDC
  // balance. `useUSDCBalance` keys its query on
  // ["usdc-balance", "sepolia", walletAddress], so invalidating the
  // prefix covers the wallet hero here and the payout-methods card
  // in one pass.
  const refreshBalance = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ["usdc-balance"] });
    }, BALANCE_REFETCH_FOLLOWUP_MS);
  }, [queryClient]);

  // On-chain liquid balance from the Dynamic indexer.
  const onchainBalance = usdcBalance.raw?.balance ?? 0;

  // What the host can actually move right now = real balance minus
  // anything parked in a (demo) yield position. Real contract calls
  // would make this superfluous — the ERC-20 `balanceOf` would already
  // reflect tokens transferred into the protocol — but since the yield
  // flow is mocked, we subtract client-side so the UI story is
  // consistent.
  const availableBalance = Math.max(0, onchainBalance - totalDeposited);
  const formattedAvailable = formatUsdc(availableBalance);
  const formattedTotal = formatUsdc(onchainBalance);

  const strategyById = useMemo(
    () => new Map(strategies.map((s) => [s.id, s])),
    [strategies],
  );

  // ---------------------------------------------------------------------------
  // Empty states
  // ---------------------------------------------------------------------------

  if (!walletAddress) {
    return (
      <EmptyState
        title="No wallet yet"
        body="Set up a stablecoin wallet from your payout methods to send and earn on your payouts."
        cta={{ href: "/payment-methods", label: "Set up wallet" }}
      />
    );
  }

  if (!isEmbedded) {
    // CeFi (exchange) wallets are custodied by the exchange; external
    // browser-extension wallets (MetaMask, Rabby, …) are self-custodial
    // but still can't be signed for from this app. Tailor the copy so
    // we don't tell a MetaMask user their wallet is custodied by
    // someone else, and never leak the raw Dynamic provider key.
    const isExternal =
      walletProvider?.startsWith(EXTERNAL_WALLET_PROVIDER_PREFIX) ?? false;
    const providerName = isExternal
      ? externalWalletLabel ?? "external"
      : walletProvider
        ? getExchangeDisplay(walletProvider).name
        : "exchange";
    const body = isExternal
      ? `Your ${providerName} wallet is self-custodied. Connect an embedded wallet to enable these actions here.`
      : `Your ${providerName} account is custodied by ${providerName}. Connect an embedded wallet to enable these actions here.`;

    return (
      <EmptyState
        title={isExternal ? "External wallet connected" : "Exchange wallet connected"}
        body={body}
        cta={{ href: "/payment-methods", label: "Manage payout methods" }}
        address={walletAddress}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Heading */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-(--brand-fg)">
              My wallet
            </h1>
            <p className="text-sm text-(--brand-muted) mt-1">
              Send and earn on your stablecoin payouts
            </p>
          </div>
          <SimulatePayoutButton />
        </div>

        {/* Balance hero */}
        <section className="relative overflow-hidden rounded-(--brand-radius-lg) border border-(--brand-border) bg-(--brand-surface) p-6">
          <div
            aria-hidden="true"
            className="absolute -top-20 -right-24 w-72 h-72 rounded-full blur-3xl opacity-10 bg-(--brand-primary)"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-(--brand-muted)">
                <Wallet className="w-3.5 h-3.5" />
                <span>Embedded wallet</span>
                {networkLabel && (
                  <>
                    <span className="text-(--brand-border)">·</span>
                    <span>{networkLabel}</span>
                  </>
                )}
              </div>
              <p className="mt-3 text-3xl font-semibold text-(--brand-fg) tabular-nums">
                {usdcBalance.isLoading && onchainBalance === 0
                  ? "—"
                  : formattedAvailable}
              </p>
              <p className="text-xs text-(--brand-muted) mt-1 tabular-nums">
                {totalDeposited > 0
                  ? `${formattedTotal} total · ${formatUsdc(totalDeposited)} earning`
                  : `≈ ${formatUsd(availableBalance)} available`}
              </p>
              <p className="mt-3 text-xs font-mono text-(--brand-muted)">
                {truncateAddress(walletAddress)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => usdcBalance.refetch()}
              disabled={usdcBalance.isFetching}
              className="shrink-0 p-2 rounded-md text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors disabled:opacity-50"
              aria-label="Refresh balance"
            >
              <RefreshCw
                className={cn(
                  "w-4 h-4",
                  usdcBalance.isFetching && "animate-spin",
                )}
              />
            </button>
          </div>
        </section>

        {/* Actions grid */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-(--brand-muted) mb-2">
            Quick actions
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <ActionTile
              icon={<ArrowUpRight className="w-4 h-4" />}
              label="Send"
              description="Transfer USDC"
              onClick={() => setSendOpen(true)}
            />
            <ActionTile
              icon={<TrendingUp className="w-4 h-4" />}
              label="Earn"
              description="Yield on idle USDC"
              accent
              onClick={() => setYieldOpen(true)}
            />
            <ActionTile
              icon={<Repeat2 className="w-4 h-4" />}
              label="Swap"
              description="Coming soon"
              disabled
            />
          </div>
        </section>

        {/* Yield positions */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-(--brand-muted)">
              Earning
            </h2>
            {totalDeposited > 0 && (
              <span className="text-xs text-(--brand-muted) tabular-nums">
                {formatUsdc(totalDeposited)} deposited
              </span>
            )}
          </div>

          {positions.length === 0 ? (
            <YieldPreview
              strategies={strategies}
              onStart={() => setYieldOpen(true)}
            />
          ) : (
            <div className="rounded-(--brand-radius-lg) border border-(--brand-border) bg-(--brand-surface) divide-y divide-(--brand-border)">
              {positions.map((p) => {
                const s = strategyById.get(p.strategyId);
                if (!s) return null;
                const earnings = estimateEarnings(
                  p.amount,
                  s.apy,
                  p.depositedAt,
                );
                return (
                  <div
                    key={p.strategyId}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-(--brand-row-bg) border border-(--brand-border) flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-(--brand-primary)" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-(--brand-fg)">
                          {s.protocol}
                        </p>
                        <p className="text-sm font-semibold text-(--brand-fg) tabular-nums">
                          {formatUsdc(p.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-(--brand-muted)">
                          {s.apy.toFixed(2)}% APY · {s.network}
                        </p>
                        <p className="text-xs text-(--brand-success) tabular-nums">
                          +{earnings} earned
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => withdraw(p.strategyId)}
                      className="shrink-0 text-xs font-medium text-(--brand-primary) hover:underline"
                    >
                      Withdraw
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Transactions link */}
        <section>
          <Link
            href="/transactions"
            className="flex items-center justify-between p-4 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-surface) hover:bg-(--brand-row-hover) transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-(--brand-fg)">
                Recent payouts
              </p>
              <p className="text-xs text-(--brand-muted) mt-0.5">
                See every payout into this wallet
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-(--brand-muted)" />
          </Link>
        </section>
      </div>

      <SendUsdcModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        balance={availableBalance}
        formattedBalance={formattedAvailable}
        onSuccess={refreshBalance}
      />
      <YieldModal
        isOpen={yieldOpen}
        onClose={() => setYieldOpen(false)}
        balance={availableBalance}
        formattedBalance={formattedAvailable}
        onDeposit={() => usdcBalance.refetch()}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  accent?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function ActionTile({
  icon,
  label,
  description,
  accent,
  onClick,
  disabled,
  disabledReason,
}: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={cn(
        "group flex flex-col items-start gap-2 p-4 rounded-(--brand-radius) border text-left transition-all",
        disabled
          ? "border-(--brand-border) bg-(--brand-row-bg) opacity-60"
          : "border-(--brand-border) bg-(--brand-surface) hover:bg-(--brand-row-hover) hover:border-(--brand-primary)/40 hover:-translate-y-0.5",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
          accent
            ? "bg-(--brand-primary) text-white"
            : "bg-(--brand-row-bg) border border-(--brand-border) text-(--brand-fg)",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-(--brand-fg)">{label}</p>
        <p className="text-xs text-(--brand-muted) mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function YieldPreview({
  strategies,
  onStart,
}: {
  strategies: YieldStrategy[];
  onStart: () => void;
}) {
  const bestApy = Math.max(...strategies.map((s) => s.apy));
  return (
    <div className="rounded-(--brand-radius-lg) border border-(--brand-border) bg-(--brand-surface) p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-(--brand-fg)">
            Put idle USDC to work
          </p>
          <p className="text-xs text-(--brand-muted) mt-0.5">
            Park idle payouts and earn up to{" "}
            <span className="font-semibold text-(--brand-success)">
              {bestApy.toFixed(2)}% APY
            </span>{" "}
            on the same wallet.
          </p>
          <div className="mt-3 flex items-center gap-4">
            {strategies.slice(0, 3).map((s) => (
              <div key={s.id} className="text-xs">
                <p className="font-medium text-(--brand-fg)">{s.protocol}</p>
                <p className="text-(--brand-success) tabular-nums">
                  {s.apy.toFixed(2)}% APY
                </p>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-4" onClick={onStart}>
            Explore yield
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
  address,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
  address?: string;
}) {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-(--brand-row-bg) border border-(--brand-border) flex items-center justify-center">
        <Wallet className="w-5 h-5 text-(--brand-muted)" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-(--brand-fg)">{title}</h1>
      <p className="mt-2 text-sm text-(--brand-muted)">{body}</p>
      {address && (
        <p className="mt-3 text-xs font-mono text-(--brand-muted)">
          {truncateAddress(address)}
        </p>
      )}
      <Link href={cta.href} className="inline-block mt-5">
        <Button size="sm">{cta.label}</Button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatUsdc(value: number): string {
  return (
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " USDC"
  );
}

function formatUsd(value: number): string {
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Back-of-envelope elapsed earnings for a demo position. Treats APY
 * as simple interest over elapsed seconds so the number starts
 * visibly ticking up the moment the user lands back on the wallet.
 */
function estimateEarnings(
  principal: number,
  apy: number,
  depositedAt: number,
): string {
  const elapsedSeconds = Math.max(0, (Date.now() - depositedAt) / 1000);
  const yearSeconds = 365 * 24 * 60 * 60;
  const earned = principal * (apy / 100) * (elapsedSeconds / yearSeconds);
  return earned.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}
