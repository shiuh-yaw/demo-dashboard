"use client";

import Image from "next/image";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockBalances } from "@/hooks/use-mock-balances";

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  image: string;
  balance: number;
  decimals: number;
  contractAddress: string | null;
}

interface TokenSelectStepProps {
  onSelect: (token: TokenInfo) => void;
}

export function TokenSelectStep({ onSelect }: TokenSelectStepProps) {
  const { data: coins, isLoading } = useMarketCoins({ perPage: 15 });
  const { getBalance } = useMockBalances();

  if (isLoading) {
    return (
      <div className="py-12 text-center text-trade-text-muted text-sm">
        Loading tokens...
      </div>
    );
  }

  const tokens: TokenInfo[] = (coins ?? [])
    .filter((c) => c.current_price != null && c.current_price > 0)
    .map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      balance: getBalance(coin.symbol),
      decimals: 18,
      contractAddress: null,
    }))
    .filter((t) => t.balance > 0);

  if (tokens.length === 0) {
    return (
      <div className="py-12 text-center text-trade-text-muted text-sm">
        No tokens with balance
      </div>
    );
  }

  return (
    <div className="max-h-[360px] overflow-y-auto -mx-1 px-1">
      {tokens.map((token, i) => (
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
          <p className="text-[15px] font-medium text-trade-text-primary tabular-nums">
            {token.balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </p>
        </button>
      ))}
    </div>
  );
}
