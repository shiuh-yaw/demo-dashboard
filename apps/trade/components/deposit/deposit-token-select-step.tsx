"use client";

import Image from "next/image";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockBalances } from "@/hooks/use-mock-balances";

export interface DepositTokenInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
}

interface DepositTokenSelectStepProps {
  onSelect: (token: DepositTokenInfo) => void;
}

const DEPOSIT_TOKENS = ["USDC", "BTC", "ETH", "SOL"];

export function DepositTokenSelectStep({
  onSelect,
}: DepositTokenSelectStepProps) {
  const { data: coins, isLoading } = useMarketCoins({ perPage: 15 });
  const { getBalance } = useMockBalances();

  if (isLoading) {
    return (
      <div className="py-12 text-center text-trade-text-muted text-sm">
        Loading tokens...
      </div>
    );
  }

  const tokens: DepositTokenInfo[] = (coins ?? [])
    .filter(
      (c) =>
        c.current_price != null &&
        c.current_price > 0 &&
        DEPOSIT_TOKENS.includes(c.symbol.toUpperCase()),
    )
    .map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      price: coin.current_price ?? 0,
    }))
    .sort(
      (a, b) => DEPOSIT_TOKENS.indexOf(a.symbol) - DEPOSIT_TOKENS.indexOf(b.symbol),
    );

  if (tokens.length === 0) {
    return (
      <div className="py-12 text-center text-trade-text-muted text-sm">
        No tokens available
      </div>
    );
  }

  return (
    <div className="max-h-[360px] overflow-y-auto -mx-1 px-1">
      {tokens.map((token, i) => {
        const balance = getBalance(token.symbol);
        return (
          <button
            key={token.id}
            type="button"
            onClick={() => onSelect(token)}
            className={`w-full flex items-center justify-between px-2 py-3.5 cursor-pointer rounded-lg transition-colors hover:bg-trade-bg outline-none ${
              i < tokens.length - 1 ? "border-b border-trade-border/40" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
                <Image
                  src={token.image}
                  alt={token.name}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-semibold text-trade-text-primary">
                  {token.name}
                </p>
                <p className="text-[13px] text-trade-text-secondary">
                  {token.symbol}
                </p>
              </div>
            </div>
            {balance > 0 && (
              <p className="text-[13px] text-trade-text-secondary tabular-nums">
                {balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
