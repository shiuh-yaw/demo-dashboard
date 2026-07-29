"use client";

/**
 * Action-triggered balance polling.
 *
 * Card balances only change when the user acts (mint / deposit) or when Rain
 * credits an on-chain deposit shortly after - there's no external mutation to
 * watch for, so polling forever is wasted work. Instead an action calls
 * `startWatch()` to open a short window during which the balance hooks poll
 * (via `useBalancePollInterval`); outside the window they only fetch on mount
 * or manual refresh.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/** How long to keep polling after an action, and how often within it. */
const WATCH_MS = 60_000;
const POLL_MS = 3_000;

interface BalanceWatchValue {
  /** Epoch ms until which balances should poll. */
  watchUntil: number;
  /** Open a fresh polling window (call after a mint / deposit succeeds). */
  startWatch: () => void;
}

const BalanceWatchContext = createContext<BalanceWatchValue>({
  watchUntil: 0,
  startWatch: () => {},
});

export function BalanceWatchProvider({ children }: { children: ReactNode }) {
  const [watchUntil, setWatchUntil] = useState(0);
  const startWatch = useCallback(
    () => setWatchUntil(Date.now() + WATCH_MS),
    [],
  );
  return (
    <BalanceWatchContext.Provider value={{ watchUntil, startWatch }}>
      {children}
    </BalanceWatchContext.Provider>
  );
}

export function useBalanceWatch(): BalanceWatchValue {
  return useContext(BalanceWatchContext);
}

/**
 * `refetchInterval` value for a balance query: `POLL_MS` while inside the
 * post-action window, else `false` (no polling). Each poll re-renders the
 * consumer, so once the window elapses the next evaluation returns false and
 * react-query stops.
 */
export function useBalancePollInterval(): number | false {
  const { watchUntil } = useBalanceWatch();
  return Date.now() < watchUntil ? POLL_MS : false;
}
