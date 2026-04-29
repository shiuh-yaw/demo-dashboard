"use client";

// Review step — consolidated. Top row = source wallet identity + chain.
// Middle = you-pay ↔ settles-as presented side-by-side (from→to swap UI
// pattern). Bottom = totals, then confirm.
//
// Attaches the source and fetches the quote in a single queryFn so the
// on-chain source is locked in before the totals render.
import {
  attachCheckoutTransactionSource,
  getActiveNetworkData,
  getCheckoutTransactionQuote,
  getNetworksData,
  type NetworkData,
} from "@dynamic-labs-sdk/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { formatUnits } from "viem";
import { NETWORKS_QUERY_KEY } from "../NetworkSelector.js";
import { GhostButton, Panel, PrimaryButton, Spinner } from "../primitives.js";
import type { ReviewQuoteViewProps } from "../types.js";
import { Amount } from "@/components/ui/Amount.js";
import { formatTokenBalance } from "@/lib/format.js";

export function ReviewQuoteView({
  transactionId,
  walletAccount,
  fromToken,
  onBack,
  onConfirm,
}: ReviewQuoteViewProps) {
  const networksQuery = useQuery<NetworkData[]>({
    queryKey: [NETWORKS_QUERY_KEY],
    queryFn: () => getNetworksData(),
    staleTime: Infinity,
  });

  const quoteQuery = useQuery({
    queryKey: ["quote", transactionId, fromToken.address],
    queryFn: async () => {
      const { networkData } = await getActiveNetworkData({ walletAccount });
      await attachCheckoutTransactionSource({
        fromAddress: walletAccount.address,
        fromChainId: networkData?.networkId ?? "",
        fromChainName: walletAccount.chain,
        transactionId,
      });
      const tx = await getCheckoutTransactionQuote({
        fromTokenAddress: fromToken.address,
        transactionId,
      });
      return { tx, fromNetwork: networkData };
    },
  });

  const shortAddress = `${walletAccount.address.slice(0, 6)}…${walletAccount.address.slice(-4)}`;
  const loadedNetwork = quoteQuery.data?.fromNetwork;

  const header = (
    <div className="flex items-center justify-between gap-3 pb-5 border-b border-white/10">
      <div className="min-w-0">
        <p className="label mb-1.5">Paying from</p>
        <p className="text-sm font-mono text-white truncate">
          {shortAddress}{" "}
          <span className="text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
            ({walletAccount.chain})
          </span>
        </p>
      </div>
      {loadedNetwork?.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={loadedNetwork.iconUrl}
          alt=""
          className="h-8 w-8 rounded-full shrink-0"
        />
      )}
    </div>
  );

  if (quoteQuery.isLoading) {
    return (
      <Panel step={3}>
        {header}
        <Spinner label="Fetching quote…" />
      </Panel>
    );
  }

  if (quoteQuery.error) {
    return (
      <Panel step={3}>
        {header}
        <div className="rounded-2xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-4 py-3 text-sm text-[var(--color-pink-100)]">
          {quoteQuery.error.message}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <GhostButton onClick={onBack}>Back</GhostButton>
          <PrimaryButton onClick={() => quoteQuery.refetch()}>
            Retry
          </PrimaryButton>
        </div>
      </Panel>
    );
  }

  const data = quoteQuery.data;
  const quote = data?.tx.quote;
  if (!data || !quote) return null;

  const { tx, fromNetwork } = data;
  const amountUsd = Number(tx.amount);
  const totalFee = Number(quote.fees?.totalFeeUsd ?? 0);
  const totalDue = (amountUsd + totalFee).toFixed(2);

  const fromAmountDisplay = formatFromAmount(
    quote.fromAmount,
    fromToken.decimals,
  );
  const toAmountDisplay = formatFromAmount(quote.toAmount, 6);

  const destNetwork = (networksQuery.data ?? []).find((n) =>
    /base/i.test(n.displayName),
  );

  return (
    <Panel step={3}>
      {header}

      {/* Side-by-side conversion: from ↔ to */}
      <div className="relative rounded-2xl border border-[var(--color-navy-line)] bg-[color-mix(in_srgb,var(--color-navy-900)_45%,transparent)] p-4">
        <div className="grid grid-cols-2">
          <ConversionCell
            amount={fromAmountDisplay}
            symbol={fromToken.symbol}
            chain={fromNetwork?.displayName ?? walletAccount.chain}
            logoURI={fromToken.logoURI}
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full border border-[var(--color-navy-line)] bg-[var(--color-navy-tint)] text-[var(--color-blue-100)]"
          >
            <ArrowRight size={14} strokeWidth={1.75} />
          </div>
          <ConversionCell
            amount={toAmountDisplay}
            symbol="USDC"
            chain={destNetwork?.displayName ?? "Base"}
            logoURI="/token-usdc.png"
            align="right"
          />
        </div>
      </div>

      {/* Totals — typographic hierarchy instead of tracked-caps labels */}
      <dl className="space-y-2 text-[14px]">
        <SoftLine label="Amount" value={`$${amountUsd.toFixed(2)}`} />
        <SoftLine
          label="Network fee"
          value={totalFee < 0.01 ? "<$0.01" : `$${totalFee.toFixed(2)}`}
        />
        <div className="pt-3 mt-1 border-t border-[var(--color-navy-line)] flex items-baseline justify-between">
          <span className="label">Total</span>
          <Amount value={totalDue} size="md" />
        </div>
      </dl>

      <div className="grid grid-cols-[auto_1fr] gap-3 pt-1">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton onClick={onConfirm}>Confirm payment</PrimaryButton>
      </div>

      <p className="text-xs text-center text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
        {quote.estimatedTimeSec !== undefined
          ? `Estimated settlement · ~${quote.estimatedTimeSec}s · `
          : ""}
        Your wallet may prompt for approval + signature.
      </p>
    </Panel>
  );
}

function ConversionCell({
  amount,
  symbol,
  chain,
  logoURI,
  align = "left",
}: {
  amount: string;
  symbol: string;
  chain: string;
  logoURI?: string;
  align?: "left" | "right";
}) {
  const logo = logoURI ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoURI}
      alt=""
      className="h-8 w-8 rounded-full shrink-0 bg-white/5"
    />
  ) : null;

  return (
    <div
      className={[
        "flex items-center gap-3",
        align === "right" ? "flex-row-reverse text-right pl-6" : "pr-6",
      ].join(" ")}
    >
      {logo}
      <div className="min-w-0">
        <p className="text-[17px] font-semibold text-white tabular-nums leading-tight truncate">
          {amount} {symbol}
        </p>
        <p className="text-[11px] text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] mt-1 truncate">
          on {chain}
        </p>
      </div>
    </div>
  );
}

function SoftLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
        {label}
      </span>
      <span className="text-white tabular-nums">{value}</span>
    </div>
  );
}

// Accepts either a base-unit integer string ("100000000000000000") or a
// display-unit decimal string ("0.1"). Integer strings go through viem's
// `formatUnits`; decimal strings are passed straight through the balance
// formatter.
function formatFromAmount(raw: string, decimals: number): string {
  if (!raw) return "0";
  if (/^\d+$/.test(raw)) {
    try {
      return formatTokenBalance(formatUnits(BigInt(raw), decimals));
    } catch {
      // fallthrough
    }
  }
  return formatTokenBalance(raw);
}
