"use client";

// Shows wallet balances for the connected account. Wallet-balance-driven
// selection only — no manual token-address fallback.
//
// Header layout: [Paying from ……] [NetworkSelector chip] [Disconnect icon].
// The NetworkSelector sits where the "Change" button used to be; the
// disconnect icon replaces it semantically (same onDisconnect action).
//
// The balances query key includes the active networkId so switching chains
// forces a fresh fetch.
import {
  getActiveNetworkData,
  getBalances,
  type NetworkData,
} from "@dynamic-labs-sdk/client";
import { useQuery } from "@tanstack/react-query";
import { Power } from "lucide-react";
import { useMemo, useRef } from "react";
import { AccountSelector } from "../AccountSelector.js";
import { ACTIVE_NETWORK_QUERY_KEY, NetworkSelector } from "../NetworkSelector.js";
import { GhostButton, Panel, Spinner } from "../primitives.js";
import type { PickTokenViewProps } from "../types.js";
import { formatTokenBalance } from "@/lib/format.js";

export function PickTokenView({
  walletAccount,
  accounts,
  onSelectAccount,
  minMarketValue,
  onSelect,
  onDisconnect,
}: PickTokenViewProps) {
  const suppressNextEventRef = useRef(false);

  const activeNetworkQuery = useQuery<{ networkData: NetworkData | undefined }>(
    {
      queryKey: [ACTIVE_NETWORK_QUERY_KEY, walletAccount.id],
      queryFn: () => getActiveNetworkData({ walletAccount }),
    },
  );
  const activeNetworkId = activeNetworkQuery.data?.networkData?.networkId;

  const isEvm = walletAccount.chain === "EVM";

  const balancesQuery = useQuery({
    queryKey: ["balances", walletAccount.id, activeNetworkId ?? null],
    queryFn: () =>
      getBalances({
        filterSpamTokens: true,
        includeNative: true,
        includePrices: true,
        walletAccount,
      }),
    enabled: !isEvm || activeNetworkQuery.isSuccess,
  });

  // Belt-and-suspenders spam filter. Dynamic's `filterSpamTokens: true`
  // server-side is not exhaustive — airdrop scams (unpriced ERC-20s with
  // "VBOD"/"ADOR"-style names) still leak through. We additionally require
  // that every listed token has a known positive marketValue ≥ the amount
  // due. Tokens with no price data are hidden.
  const filtered = useMemo(() => {
    const balances = balancesQuery.data ?? [];
    return balances.filter(
      (t) =>
        t.marketValue !== undefined &&
        t.marketValue > 0 &&
        t.marketValue >= minMarketValue,
    );
  }, [balancesQuery.data, minMarketValue]);

  if (balancesQuery.error) {
    return (
      <Panel>
        <div className="rounded-2xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-4 py-3 text-sm text-[var(--color-pink-100)]">
          {balancesQuery.error.message}
        </div>
        <GhostButton onClick={() => balancesQuery.refetch()}>Retry</GhostButton>
      </Panel>
    );
  }

  return (
    <Panel step={2}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label mb-1.5">Paying from</p>
          <p className="text-sm font-mono text-white truncate">
            {walletAccount.address.slice(0, 6)}…
            {walletAccount.address.slice(-4)}{" "}
            <span className="text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
              ({walletAccount.chain})
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEvm && (
            <NetworkSelector
              walletAccount={walletAccount}
              suppressNextEventRef={suppressNextEventRef}
              onChange={() => {
                void balancesQuery.refetch();
              }}
            />
          )}
          <button
            type="button"
            onClick={onDisconnect}
            aria-label="Disconnect wallet"
            title="Disconnect wallet"
            className="h-10 w-10 cursor-pointer flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[var(--color-blue-100)] hover:text-white hover:border-[var(--color-pink)]/50 hover:bg-[var(--color-pink)]/10 transition-colors"
          >
            <Power size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <AccountSelector
        accounts={accounts}
        selected={walletAccount}
        onSelect={onSelectAccount}
      />

      <div className="border-t border-white/10 pt-5">
        <p className="label mb-3">Pick a token</p>
        {balancesQuery.isLoading && <Spinner label="Loading balances…" />}
        {!balancesQuery.isLoading && filtered.length === 0 && (
          <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_65%,transparent)] py-2">
            No supported tokens — switch networks above or in your wallet.
          </p>
        )}
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {filtered.map((token) => (
            <button
              key={`${token.address}-${token.symbol}`}
              type="button"
              onClick={() =>
                onSelect({
                  address: token.address,
                  symbol: token.symbol,
                  name: token.name,
                  decimals: token.decimals,
                  logoURI: token.logoURI,
                })
              }
              className="row group text-left"
            >
              {token.logoURI ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={token.logoURI}
                  alt=""
                  className="w-8 h-8 rounded-full shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 text-[10px] font-semibold flex items-center justify-center shrink-0">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-white">
                  {token.symbol}
                </div>
                <div className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] truncate">
                  {token.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-semibold text-white tabular-nums">
                  {formatTokenBalance(token.balance)}
                </div>
                {token.marketValue !== undefined && (
                  <div className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] tabular-nums">
                    ${token.marketValue.toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

