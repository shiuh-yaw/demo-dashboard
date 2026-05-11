"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress } from "viem";
import {
  WidgetCard,
  ErrorBanner,
  widgetHeaderTrailingIconButtonClassName,
} from "@dynamic-demos/ui";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
} from "lucide-react";
import { getDepositUsdcBalance } from "@/lib/balance/client";
import {
  DEPOSIT_ASSETS,
  getBaseAddressExplorerUrl,
  getDepositAssetId,
} from "@/lib/assets";
import { depositAddressRowIconButtonClassName } from "@/lib/deposit-address-row-styles";
import {
  DEPOSIT_ROW_STATUS_COLORS,
  DEPOSIT_ROW_STATUS_LABELS,
} from "@/lib/deposit-list-status";
import { formatDepositTimeAgo } from "@/lib/format-deposit-time-ago";
import { useDepositWidgetFlow } from "@/contexts/deposit-widget-flow-context";
import { useDepositNetwork } from "@/contexts/deposit-network-context";
import { depositNetworkLabel } from "@/lib/deposit-network";
import { useDepositStatusQuery } from "@/hooks/use-deposit-status-query";
import { useDepositTimeClock } from "@/hooks/use-deposit-time-clock";
import { useSendDeposit } from "@/hooks/use-send-deposit";
import { DepositTransactionDetail } from "./deposit-transaction-detail";
import { DepositRowIcon } from "./deposit-row-icon";

/** Main deposit UX; must render under {@link DepositWidgetFlowProvider} in `deposit` phase. */
export function DepositScreen() {
  const { screen, handleLogout: onLogout } = useDepositWidgetFlow();

  const isDeposit = screen.type === "deposit";
  const vaultId = isDeposit ? screen.vaultId : "";
  const addresses = isDeposit ? screen.addresses : {};
  const embeddedWalletAddress = isDeposit ? screen.embeddedWalletAddress : "";

  const [selectedIncomingId, setSelectedIncomingId] = useState<string | null>(
    null,
  );
  const [depositsRefreshing, setDepositsRefreshing] = useState(false);
  const [amount, setAmount] = useState("");
  const [depositAddrCopied, setDepositAddrCopied] = useState(false);
  const listNowMs = useDepositTimeClock(30_000);
  const { network, walletNetworkMismatch, mismatchMessage } =
    useDepositNetwork();
  const assetId = getDepositAssetId(network);
  const depositAddress = addresses[assetId] ?? "";
  const forwardAddr = embeddedWalletAddress.trim() as `0x${string}`;
  const forwardAddrValid = isAddress(forwardAddr);

  const {
    externalWalletAddress,
    send: sendDepositTx,
    isSending,
    txHash: sendTxHash,
    error: sendError,
    clearError: clearSendError,
  } = useSendDeposit(depositAddress, network);

  const { data: status, refetch: refetchDepositStatus } = useDepositStatusQuery(
    vaultId,
    assetId,
  );

  const {
    data: forwardUsdcBalance,
    isPending: forwardBalanceLoading,
    refetch: refetchForwardBalance,
  } = useQuery({
    queryKey: ["embedded-wallet-usdc-balance", forwardAddr, network],
    queryFn: () => getDepositUsdcBalance(forwardAddr, network),
    enabled: isDeposit && forwardAddrValid,
    refetchInterval: 5000,
  });

  const deposits = status?.deposits ?? [];

  const selectedDeposit =
    selectedIncomingId &&
    deposits.find((d) => d.incomingTxId === selectedIncomingId);

  const externalAddr = externalWalletAddress?.trim() as
    | `0x${string}`
    | undefined;
  const externalAddrValid = !!externalAddr && isAddress(externalAddr);

  const { data: externalUsdcBalance, isPending: externalBalanceLoading } =
    useQuery({
      queryKey: ["external-wallet-usdc-balance", externalAddr, network],
      queryFn: () => getDepositUsdcBalance(externalAddr!, network),
      enabled: isDeposit && externalAddrValid,
      refetchInterval: 10_000,
    });

  useEffect(() => {
    if (
      selectedIncomingId &&
      !deposits.some((d) => d.incomingTxId === selectedIncomingId)
    ) {
      setSelectedIncomingId(null);
    }
  }, [selectedIncomingId, deposits]);

  if (!isDeposit) return null;

  const networkLabel = depositNetworkLabel(network);
  const forwardExplorerUrl = getBaseAddressExplorerUrl(
    network,
    embeddedWalletAddress,
  );

  const refreshDeposits = () => {
    void (async () => {
      setDepositsRefreshing(true);
      try {
        await Promise.all([
          refetchDepositStatus(),
          forwardAddrValid ? refetchForwardBalance() : Promise.resolve(),
        ]);
      } finally {
        setDepositsRefreshing(false);
      }
    })();
  };

  const logoutTrailing = (
    <button
      type="button"
      onClick={() => void Promise.resolve(onLogout())}
      className={widgetHeaderTrailingIconButtonClassName}
      aria-label="Log out"
      title="Log out"
    >
      <LogOut className="size-4" strokeWidth={2} aria-hidden />
    </button>
  );

  if (selectedDeposit) {
    return (
      <WidgetCard
        title="Transaction"
        subtitle={`${selectedDeposit.amount} ${DEPOSIT_ASSETS.USDC.symbol} · ${networkLabel}`}
        onBack={() => setSelectedIncomingId(null)}
        trailing={logoutTrailing}
      >
        <div className="space-y-3">
          <DepositTransactionDetail
            deposit={selectedDeposit}
            network={network}
            onRefresh={refreshDeposits}
            isRefreshing={depositsRefreshing}
          />
        </div>
      </WidgetCard>
    );
  }

  const copyDepositAddress = () => {
    if (!depositAddress) return;
    void navigator.clipboard.writeText(depositAddress).then(() => {
      setDepositAddrCopied(true);
      setTimeout(() => setDepositAddrCopied(false), 2000);
    });
  };

  return (
    <WidgetCard title="Deposit" trailing={logoutTrailing}>
      <div className="space-y-4">
        {walletNetworkMismatch && mismatchMessage && (
          <div className="flex items-start gap-2 rounded-(--brand-radius) border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
            <span>{mismatchMessage}</span>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="deposit-amount"
              className="text-xs font-medium text-(--brand-muted)"
            >
              Send {DEPOSIT_ASSETS.USDC.symbol}
            </label>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-(--brand-muted)">
              {externalBalanceLoading ? (
                <Loader2
                  className="size-3 animate-spin opacity-70"
                  aria-hidden
                />
              ) : externalUsdcBalance != null ? (
                <>
                  <span>Balance</span>
                  <span className="tabular-nums text-(--brand-fg) font-medium">
                    {externalUsdcBalance}
                  </span>
                  <button
                    type="button"
                    disabled={
                      isSending ||
                      !externalUsdcBalance ||
                      externalUsdcBalance === "0"
                    }
                    onClick={() => {
                      setAmount(externalUsdcBalance);
                      clearSendError();
                    }}
                    className="rounded px-1 py-0.5 text-[10px] font-semibold uppercase text-(--brand-accent) hover:bg-(--brand-accent)/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Max
                  </button>
                </>
              ) : null}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="deposit-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,6}$/.test(v)) {
                    setAmount(v);
                    clearSendError();
                  }
                }}
                disabled={isSending}
                className="w-full rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2.5 pr-16 text-sm tabular-nums outline-none transition-colors focus:border-(--brand-accent) disabled:opacity-50"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-(--brand-muted)">
                {DEPOSIT_ASSETS.USDC.symbol}
              </span>
            </div>
            <button
              type="button"
              disabled={
                isSending ||
                !amount ||
                Number(amount) <= 0 ||
                !externalWalletAddress ||
                walletNetworkMismatch
              }
              onClick={() =>
                void sendDepositTx(amount).then(() => {
                  setAmount("");
                  setTimeout(() => void refetchDepositStatus(), 3000);
                  setTimeout(() => void refetchDepositStatus(), 8000);
                })
              }
              className="flex shrink-0 items-center gap-1.5 rounded-(--brand-radius) bg-(--brand-primary) px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--brand-primary-hover) disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" strokeWidth={2} aria-hidden />
              )}
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>

          {sendError && (
            <ErrorBanner message={sendError} onDismiss={clearSendError} />
          )}
          {sendTxHash && (
            <p className="flex items-center gap-1 text-xs text-(--brand-success)">
              <Check
                className="size-3.5 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
              <span>Sent — deposit will appear shortly.</span>
            </p>
          )}

          {depositAddress && (
            <button
              type="button"
              onClick={copyDepositAddress}
              className="inline-flex items-center gap-1 text-[11px] text-(--brand-muted) transition-colors hover:text-(--brand-fg)"
              title="Copy deposit address to clipboard"
            >
              {depositAddrCopied ? (
                <>
                  <Check
                    className="size-3 shrink-0 text-(--brand-success)"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy
                    className="size-3 shrink-0"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>Or copy deposit address</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-(--brand-muted)">
            Funds will be forwarded to
          </label>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border)">
            <code className="flex-1 min-w-0 text-xs font-mono text-(--brand-muted) truncate">
              {embeddedWalletAddress}
            </code>
            <a
              href={forwardExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={depositAddressRowIconButtonClassName}
              aria-label="View wallet on block explorer"
              title="Block explorer"
            >
              <ExternalLink className="size-4" strokeWidth={2} aria-hidden />
            </a>
          </div>
          <p
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-(--brand-muted)"
            role="status"
            aria-live="polite"
          >
            <span className="font-medium text-(--brand-muted)">
              Wallet balance
            </span>
            {forwardBalanceLoading ? (
              <>
                <Loader2
                  className="size-3 shrink-0 animate-spin opacity-70"
                  aria-hidden
                />
                <span>Loading…</span>
              </>
            ) : forwardUsdcBalance != null ? (
              <>
                <span className="tabular-nums text-(--brand-fg)">
                  {forwardUsdcBalance} {DEPOSIT_ASSETS.USDC.symbol}
                </span>
                <span className="opacity-80">on {networkLabel}</span>
              </>
            ) : (
              <span className="opacity-80">Unavailable</span>
            )}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs font-medium text-(--brand-muted)">
                Deposits
              </span>
              {deposits.length > 0 ? (
                <span className="text-[11px] text-(--brand-muted) opacity-80">
                  Tap a row for details and progress.
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={refreshDeposits}
              disabled={depositsRefreshing}
              className={`${depositAddressRowIconButtonClassName} disabled:opacity-50 disabled:pointer-events-none`}
              aria-label="Refresh deposits and wallet balance"
              title="Refresh"
            >
              <RefreshCw
                className={`size-4 ${depositsRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
          <ul className="max-h-52 list-none overflow-y-auto rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg)/50 p-0 m-0 [scrollbar-gutter:stable] divide-y divide-(--brand-border)">
            {deposits.length === 0 ? (
              <li
                className="flex items-center gap-2.5 px-3 py-4 text-sm text-(--brand-muted)"
                role="status"
              >
                <Loader2
                  className="size-4 shrink-0 animate-spin opacity-70"
                  aria-hidden
                />
                <span>Waiting for a deposit…</span>
              </li>
            ) : (
              deposits.map((d) => (
                <li key={d.incomingTxId}>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-(--brand-row-hover) cursor-pointer"
                    onClick={() => setSelectedIncomingId(d.incomingTxId)}
                  >
                    <span className="shrink-0">
                      <DepositRowIcon status={d.status} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold leading-tight ${DEPOSIT_ROW_STATUS_COLORS[d.status]}`}
                      >
                        {DEPOSIT_ROW_STATUS_LABELS[d.status]}
                      </p>
                      {d.createdAt ? (
                        <div className="mt-0.5 text-[11px] leading-snug text-(--brand-muted)">
                          <time
                            dateTime={new Date(d.createdAt).toISOString()}
                            title={new Date(d.createdAt).toLocaleString()}
                          >
                            {formatDepositTimeAgo(d.createdAt, listNowMs)}
                          </time>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-center">
                      <p className="max-w-28 text-right text-sm font-semibold tabular-nums text-(--brand-fg)">
                        <span className="break-all">{d.amount}</span>{" "}
                        <span className="text-[11px] font-medium text-(--brand-muted)">
                          {DEPOSIT_ASSETS.USDC.symbol}
                        </span>
                      </p>
                      <ChevronRight
                        className="size-4 shrink-0 text-(--brand-muted) opacity-50 transition-opacity group-hover:opacity-80"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </WidgetCard>
  );
}
