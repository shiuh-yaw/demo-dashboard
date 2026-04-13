"use client";

import { useMemo } from "react";
import { useMarketCoins } from "@/hooks/use-market-coins";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import {
  MOCK_METADATA_KEYS,
  type MockBalancesMetadata,
} from "@/lib/mock-metadata";

const STABLECOINS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "BUSD",
  "TUSD",
  "USDP",
  "FRAX",
]);

const MOCK_BALANCE_SEED = 46281;

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * (index + 1) * 999) * 10000;
  return x - Math.floor(x);
}

function generateMockAmount(
  symbol: string,
  price: number | null,
  index: number,
): number {
  const r = seededRandom(MOCK_BALANCE_SEED, index);
  const sym = symbol.toUpperCase();

  if (STABLECOINS.has(sym)) return 50 + r * 4950;

  const priceSafe = price && price > 0 ? price : 1;

  switch (sym) {
    case "BTC":
      return 0.002 + r * 0.498;
    case "ETH":
      return 0.05 + r * 11.95;
    case "SOL":
      return 1 + r * 149;
    case "BNB":
      return 0.1 + r * 4.9;
    case "XRP":
      return 100 + r * 4900;
    case "DOGE":
      return 500 + r * 9500;
    default:
      break;
  }

  const targetUsd = 150 + r * 3850;
  return targetUsd / priceSafe;
}

/**
 * Single source of truth for mock balances.
 * - Starts empty — users deposit funds via the Deposit modal.
 * - Trade, swap, predict, earn all read from and update these balances.
 * - `seedBalances()` populates deterministic demo amounts (called from Settings).
 */
export function useMockBalances() {
  const { metadata, updateMetadata } = useMockMetadata();
  const { data: coins } = useMarketCoins({ perPage: 15 });

  const balances = (metadata[MOCK_METADATA_KEYS.BALANCES] ??
    {}) as MockBalancesMetadata;

  const getBalance = (symbol: string): number => {
    const b = balances[symbol.toUpperCase()];
    return b?.amount ?? 0;
  };

  const totalUsd = useMemo(() => {
    if (!coins?.length) return 0;
    return coins
      .filter((c) => c.current_price != null && c.current_price > 0)
      .reduce((sum, c) => {
        const amount = getBalance(c.symbol);
        const price = c.current_price ?? 0;
        return sum + amount * price;
      }, 0);
  }, [coins, balances]);

  const deductBalance = async (
    symbol: string,
    amount: number,
  ): Promise<boolean> => {
    const sym = symbol.toUpperCase();
    const current = getBalance(sym);
    if (current < amount) return false;
    const updated = { ...balances };
    updated[sym] = { amount: current - amount };
    await updateMetadata.mutateAsync({
      [MOCK_METADATA_KEYS.BALANCES]: updated,
    });
    return true;
  };

  const addBalance = async (
    symbol: string,
    amount: number,
  ): Promise<void> => {
    const sym = symbol.toUpperCase();
    const current = getBalance(sym);
    const updated = { ...balances };
    updated[sym] = { amount: current + amount };
    await updateMetadata.mutateAsync({
      [MOCK_METADATA_KEYS.BALANCES]: updated,
    });
  };

  const seedBalances = async (): Promise<void> => {
    if (!coins?.length) return;
    const seeded: MockBalancesMetadata = {};
    coins
      .filter((c) => c.current_price != null && c.current_price > 0)
      .forEach((coin, i) => {
        seeded[coin.symbol.toUpperCase()] = {
          amount: generateMockAmount(coin.symbol, coin.current_price, i),
        };
      });
    if (Object.keys(seeded).length > 0) {
      await updateMetadata.mutateAsync({
        [MOCK_METADATA_KEYS.BALANCES]: seeded,
      });
    }
  };

  return {
    balances,
    getBalance,
    deductBalance,
    addBalance,
    seedBalances,
    totalUsd,
    isInitialized: Object.keys(balances).length > 0,
  };
}
