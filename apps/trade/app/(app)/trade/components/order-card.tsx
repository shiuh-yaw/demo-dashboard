"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ArrowDownUp, ChevronRight } from "lucide-react";
import type { TradePrice } from "@/hooks/use-trade-prices";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockBalances } from "@/hooks/use-mock-balances";

type OrderTab = "swap" | "buy" | "sell";

type TokenSymbol = "USDC" | "ETH" | "BTC" | "SOL" | "MATIC" | "ARB";

interface OrderCardProps {
  prices?: Record<string, TradePrice> | null;
  /** When viewing a trade page, default the receive asset to this symbol */
  selectedSymbol?: string;
}

function TokenButton({
  symbol,
  onClick,
}: {
  symbol: string;
  onClick?: () => void;
}) {
  const { data: metadata } = useTokenMetadata(symbol);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-trade-surface border border-trade-border/50 text-trade-text-primary text-sm font-medium hover:bg-trade-surface-elevated transition-colors shrink-0"
    >
      {metadata?.logo ? (
        <Image
          src={metadata.logo}
          alt={symbol}
          width={20}
          height={20}
          className="rounded-full object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-trade-bg text-xs font-medium">
          {symbol.slice(0, 1)}
        </span>
      )}
      <span>{symbol}</span>
    </button>
  );
}

function AssetSelectorRow({
  symbol,
  onClick,
}: {
  symbol: string;
  onClick?: () => void;
}) {
  const { data: metadata } = useTokenMetadata(symbol);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl bg-trade-bg/50 border border-trade-border/50 hover:bg-trade-surface transition-colors text-left"
    >
      {metadata?.logo ? (
        <Image
          src={metadata.logo}
          alt={symbol}
          width={28}
          height={28}
          className="rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-trade-surface text-sm font-medium text-trade-text-secondary">
          {symbol.slice(0, 1)}
        </div>
      )}
      <span className="font-medium text-trade-text-primary">{symbol}</span>
      <ChevronRight size={18} className="ml-auto text-trade-text-muted" />
    </button>
  );
}

const SUPPORTED_SYMBOLS: TokenSymbol[] = [
  "USDC",
  "ETH",
  "BTC",
  "SOL",
  "MATIC",
  "ARB",
];

export function OrderCard({ prices, selectedSymbol }: OrderCardProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("swap");
  const defaultReceive = SUPPORTED_SYMBOLS.includes(
    selectedSymbol as TokenSymbol,
  )
    ? (selectedSymbol as TokenSymbol)
    : "ETH";
  const [payAsset, setPayAsset] = useState<TokenSymbol>("USDC");
  const [receiveAsset, setReceiveAsset] = useState<TokenSymbol>(defaultReceive);
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [buySellAmount, setBuySellAmount] = useState("");
  const [swapPending, setSwapPending] = useState(false);

  const { isMockMode } = useMockMode();
  const { getBalance, deductBalance, addBalance } = useMockBalances();
  const { data: marketCoins } = useMarketCoins({ perPage: 25 });

  /** Effective prices: Alchemy first, CoinGecko fallback for mock mode when Alchemy missing */
  const effectivePrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sym of SUPPORTED_SYMBOLS) {
      const fromAlchemy = prices?.[sym]?.usd;
      const fromMarket =
        marketCoins?.find((c) => c.symbol.toUpperCase() === sym)
          ?.current_price ?? null;
      map[sym] =
        fromAlchemy ??
        fromMarket ??
        (sym === "USDC" ? 1 : 0);
    }
    return map;
  }, [prices, marketCoins]);

  useEffect(() => {
    if (
      selectedSymbol &&
      SUPPORTED_SYMBOLS.includes(selectedSymbol as TokenSymbol)
    ) {
      const sym = selectedSymbol as TokenSymbol;
      if (activeTab === "swap") setReceiveAsset(sym);
      if (activeTab === "sell") setPayAsset(sym);
    }
  }, [selectedSymbol, activeTab]);

  useEffect(() => {
    if (activeTab === "sell" && payAsset === "USDC") {
      setPayAsset(receiveAsset);
    }
  }, [activeTab, payAsset, receiveAsset]);

  const handleFlip = () => {
    setPayAsset(receiveAsset);
    setReceiveAsset(payAsset);
    setPayAmount(receiveAmount);
    setReceiveAmount(payAmount);
  };

  const formatHint = (asset: string) => {
    if (asset === "USDC") return "1.00";
    const p = effectivePrices[asset];
    return p != null && p > 0
      ? `≈ $${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "≈ --";
  };

  const payBalance = isMockMode ? getBalance(payAsset) : 0;
  const receivePrice = effectivePrices[receiveAsset] ?? 0;
  const payPrice = effectivePrices[payAsset] ?? (payAsset === "USDC" ? 1 : 0);

  /** Recalculate receive amount when prices load (e.g. CoinGecko fallback) */
  useEffect(() => {
    if (payAmount && receivePrice > 0) {
      const payNum = parseFloat(payAmount);
      if (!Number.isNaN(payNum) && payNum > 0) {
        const recv =
          payAsset === "USDC"
            ? payNum / receivePrice
            : (payNum * payPrice) / receivePrice;
        setReceiveAmount(recv.toFixed(6));
      }
    }
  }, [payAmount, payAsset, receiveAsset, receivePrice, payPrice]);

  const handleSwap = async () => {
    const payNum = parseFloat(payAmount);
    if (Number.isNaN(payNum) || payNum <= 0 || !receivePrice || !payPrice)
      return;
    if (isMockMode) {
      setSwapPending(true);
      const ok = await deductBalance(payAsset, payNum);
      if (ok) {
        const receiveNum =
          payAsset === "USDC"
            ? payNum / receivePrice
            : (payNum * payPrice) / receivePrice;
        await addBalance(receiveAsset, receiveNum);
        setPayAmount("");
        setReceiveAmount("");
      }
      setSwapPending(false);
    }
  };

  const setMaxPay = () => {
    if (payBalance > 0) {
      setPayAmount(payBalance.toFixed(payAsset === "USDC" ? 2 : 6));
      if (receivePrice > 0) {
        const receiveNum =
          payAsset === "USDC"
            ? payBalance / receivePrice
            : (payBalance * payPrice) / receivePrice;
        setReceiveAmount(receiveNum.toFixed(6));
      }
    }
  };

  const quickAmounts = [100, 300, 1000];
  const percentAmounts = [25, 50, 75, 100];

  return (
    <div className="rounded-2xl p-4 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 rounded-full bg-trade-bg/60 p-1 flex-1">
          {(["swap", "buy", "sell"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
              flex-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize
              ${
                activeTab === tab
                  ? "bg-trade-accent text-white shadow-sm"
                  : "text-trade-text-secondary hover:text-trade-text-primary"
              }
            `}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "swap" && (
        <>
          <div className="rounded-xl p-3.5 mb-3 bg-trade-bg/50 border border-trade-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-trade-text-secondary">
                You Pay
              </p>
              {isMockMode && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-trade-text-muted">
                    Balance:{" "}
                    {payBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{" "}
                    {payAsset}
                  </span>
                  <button
                    type="button"
                    onClick={setMaxPay}
                    className="text-xs font-medium text-trade-accent hover:underline"
                  >
                    Max
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setPayAmount(v);
                  if (v && receivePrice > 0) {
                    const payNum = parseFloat(v);
                    if (!Number.isNaN(payNum)) {
                      const recv =
                        payAsset === "USDC"
                          ? payNum / receivePrice
                          : (payNum * payPrice) / receivePrice;
                      setReceiveAmount(recv.toFixed(6));
                    }
                  } else {
                    setReceiveAmount("");
                  }
                }}
                className="flex-1 min-w-0 text-2xl font-bold text-trade-text-primary tabular-nums bg-transparent border-none outline-none placeholder:text-trade-text-muted"
              />
              <TokenButton symbol={payAsset} />
            </div>
            <p className="text-xs text-trade-text-muted mt-1">
              {formatHint(payAsset)}
            </p>
          </div>

          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleFlip}
              className="p-1.5 rounded-full bg-trade-surface border border-trade-border/50 text-trade-text-secondary hover:text-trade-accent hover:border-trade-accent/50 transition-colors"
              aria-label="Swap assets"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          <div className="rounded-xl p-3.5 bg-trade-bg/50 border border-trade-border/50">
            <p className="text-xs uppercase tracking-wider mb-2 text-trade-text-secondary">
              You Receive
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-bold text-trade-text-primary tabular-nums min-w-0 truncate">
                {receiveAmount || "0.00"}
              </span>
              <TokenButton symbol={receiveAsset} />
            </div>
            <p className="text-xs text-trade-text-muted mt-1">
              {formatHint(receiveAsset)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSwap}
            disabled={
              !isMockMode ||
              !payAmount ||
              !receiveAmount ||
              parseFloat(payAmount) <= 0 ||
              parseFloat(receiveAmount) <= 0 ||
              parseFloat(payAmount) > payBalance ||
              swapPending
            }
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors mt-4 ${
              isMockMode &&
              payAmount &&
              receiveAmount &&
              parseFloat(payAmount) > 0 &&
              parseFloat(receiveAmount) > 0 &&
              parseFloat(payAmount) <= payBalance &&
              !swapPending
                ? "bg-trade-accent text-white hover:bg-trade-accent-hover cursor-pointer"
                : "bg-trade-surface border border-trade-border/50 text-trade-text-muted cursor-not-allowed"
            }`}
          >
            {swapPending
              ? "Swapping…"
              : payAmount && receiveAmount && parseFloat(receiveAmount) > 0
                ? "Swap"
                : "Select a token"}
          </button>
        </>
      )}

      {(activeTab === "buy" || activeTab === "sell") && (
        <>
          <div className="rounded-xl p-3.5 mb-3 bg-trade-bg/50 border border-trade-border/50">
            <p className="text-xs uppercase tracking-wider mb-3 text-trade-text-secondary">
              {activeTab === "buy" ? "You're buying" : "You're selling"}
            </p>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <div className="flex items-baseline gap-0.5 min-w-0 flex-1">
                <span className="text-3xl font-bold text-trade-text-primary">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={buySellAmount}
                  onChange={(e) =>
                    setBuySellAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="flex-1 min-w-0 text-3xl font-bold text-trade-text-primary tabular-nums bg-transparent border-none outline-none placeholder:text-trade-text-muted"
                />
              </div>
              <span className="text-sm text-trade-text-muted shrink-0">
                USD
              </span>
            </div>
            <div className="flex gap-2">
              {activeTab === "buy"
                ? quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBuySellAmount(String(amt))}
                      className="flex-1 px-3 py-1.5 rounded-full text-sm font-medium border border-trade-border/50 text-trade-text-secondary hover:border-trade-accent/50 hover:text-trade-accent transition-colors"
                    >
                      ${amt}
                    </button>
                  ))
                : percentAmounts.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBuySellAmount("")}
                      className="flex-1 px-2 py-1.5 rounded-full text-sm font-medium border border-trade-border/50 text-trade-text-secondary hover:border-trade-accent/50 hover:text-trade-accent transition-colors"
                    >
                      {pct === 100 ? "Max" : `${pct}%`}
                    </button>
                  ))}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <AssetSelectorRow
              symbol={activeTab === "buy" ? receiveAsset : payAsset}
            />
            <div className="flex items-center justify-center">
              <div className="h-4 w-px bg-trade-border/50" />
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl bg-trade-bg/50 border border-trade-border/50 hover:bg-trade-surface transition-colors text-left"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-trade-surface text-sm font-medium text-trade-text-secondary">
                $
              </div>
              <span className="font-medium text-trade-text-primary">
                {activeTab === "buy" ? "From" : "To"} USD Wallet
              </span>
              <ChevronRight
                size={18}
                className="ml-auto text-trade-text-muted"
              />
            </button>
          </div>

          <button
            type="button"
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              buySellAmount
                ? "bg-trade-accent text-white hover:bg-trade-accent-hover cursor-pointer"
                : "bg-trade-surface border border-trade-border/50 text-trade-text-muted cursor-not-allowed"
            }`}
            disabled={!buySellAmount}
          >
            {buySellAmount ? "Review order" : "Enter an amount"}
          </button>
        </>
      )}
    </div>
  );
}
