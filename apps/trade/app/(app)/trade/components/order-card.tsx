"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ArrowDownUp } from "lucide-react";
import type { TradePrice } from "@/hooks/use-trade-prices";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockBalances } from "@/hooks/use-mock-balances";

type TokenSymbol = "USDC" | "ETH" | "BTC" | "SOL" | "MATIC" | "ARB";

interface OrderCardProps {
  prices?: Record<string, TradePrice> | null;
  /** When viewing a trade page, default the receive asset to this symbol */
  selectedSymbol?: string;
}

function TokenButton({
  symbol,
}: {
  symbol: string;
}) {
  const { data: metadata } = useTokenMetadata(symbol);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-trade-surface border border-trade-border/50 text-trade-text-primary text-sm font-medium shrink-0">
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
    </div>
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
  const defaultReceive = selectedSymbol?.toUpperCase() || "ETH";
  const [payAsset, setPayAsset] = useState<string>("USDC");
  const [receiveAsset, setReceiveAsset] = useState<string>(defaultReceive);
  const [payAmount, setPayAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [swapPending, setSwapPending] = useState(false);

  const { isMockMode } = useMockMode();
  const { getBalance, deductBalance, addBalance } = useMockBalances();
  const { data: marketCoins } = useMarketCoins({ perPage: 25 });

  /** Effective prices: Alchemy first, CoinGecko fallback for any symbol */
  const effectivePrices = useMemo(() => {
    const map: Record<string, number> = {};
    const allSymbols = new Set([
      ...SUPPORTED_SYMBOLS,
      payAsset,
      receiveAsset,
    ]);
    for (const sym of allSymbols) {
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
  }, [prices, marketCoins, payAsset, receiveAsset]);

  useEffect(() => {
    if (selectedSymbol) {
      setReceiveAsset(selectedSymbol.toUpperCase());
    }
  }, [selectedSymbol]);

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

  return (
    <div className="rounded-2xl p-4 bg-trade-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <p className="text-sm font-medium text-trade-text-secondary uppercase tracking-wider mb-4">
        Swap
      </p>
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
    </div>
  );
}
