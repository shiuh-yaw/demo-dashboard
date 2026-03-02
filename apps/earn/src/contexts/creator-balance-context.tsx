"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Real PYUSD balance from Dynamic wallet (Total balance). Shared so Add funds uses same value as the balance card. */
interface CreatorBalanceContextValue {
  /** Raw balance string (e.g. "1276.00") or null while loading. */
  balance: string | null;
  setBalance: (value: string | null) => void;
  /** Optimistically deduct an amount from balance (e.g. after Add funds tx succeeds). */
  deductBalance: (amount: number) => void;
  /** Optimistically add an amount to balance (e.g. after Get paid/mint tx succeeds). */
  addToBalance: (amount: number) => void;
  /** Trigger a balance refresh from blockchain. Increment to refresh. */
  refreshKey: number;
  /** Call to trigger a balance refresh from blockchain. */
  triggerRefresh: () => void;
}

const CreatorBalanceContext = createContext<CreatorBalanceContextValue | null>(
  null
);

export function CreatorBalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable function references - don't recreate on every balance change
  const deductBalance = useCallback((amount: number) => {
    setBalance((prev) => {
      if (prev === null) return null;
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, current - amount);
      return next.toFixed(2);
    });
  }, []);

  const addToBalance = useCallback((amount: number) => {
    setBalance((prev) => {
      if (prev === null) return null;
      const current = parseFloat(prev) || 0;
      const next = current + amount;
      return next.toFixed(2);
    });
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ balance, setBalance, deductBalance, addToBalance, refreshKey, triggerRefresh }),
    [balance, deductBalance, addToBalance, refreshKey, triggerRefresh]
  );

  return (
    <CreatorBalanceContext.Provider value={value}>
      {children}
    </CreatorBalanceContext.Provider>
  );
}

export function useCreatorBalance(): CreatorBalanceContextValue {
  const ctx = useContext(CreatorBalanceContext);
  if (!ctx) {
    throw new Error(
      "useCreatorBalance must be used within CreatorBalanceProvider"
    );
  }
  return ctx;
}

export function useCreatorBalanceOptional(): CreatorBalanceContextValue | null {
  return useContext(CreatorBalanceContext);
}
