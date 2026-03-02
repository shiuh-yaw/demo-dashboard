"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSSRSafeState,
  HIGHLIGHT_DURATION_MS,
  loadState,
  recordPayoutRequest as recordPayoutRequestStore,
  resetPayoutState as resetPayoutStateStore,
  type PayoutDemoState,
} from "@/lib/payout-demo-store";
import {
  addFundsToPrepaid,
  getSSRSafePrepaidBalance,
  loadPrepaidBalance,
  resetPrepaidBalance as resetPrepaidBalanceStore,
} from "@/lib/prepaid-card-demo-store";
import {
  type ActivityItem,
  addActivity,
  createAddFundsActivity,
  createGetPaidActivity,
  createWithdrawActivity,
  createPIXWithdrawActivity,
  getSSRSafeActivities,
  loadActivities,
  resetActivities as resetActivitiesStore,
} from "@/lib/activity-demo-store";

interface PayoutDemoContextValue {
  state: PayoutDemoState;
  highlightUpcoming: boolean;
  /** False until we've loaded from localStorage (or created and stored). Use to avoid showing values that change after load. */
  isHydrated: boolean;
  recordPayoutRequest: (amount: number) => void;
  resetPayoutDemo: () => void;
  /** Prepaid card balance (demo: stored in localStorage). */
  prepaidBalance: number;
  addFunds: (amount: number) => void;
  /** Recent activity items (demo: stored in localStorage). */
  activities: ActivityItem[];
  /** Record an "Add funds to prepaid card" activity. */
  recordAddFundsActivity: (amount: number) => void;
  /** Record a "Withdraw to wallet" activity. */
  recordWithdrawActivity: (amount: number, walletAddress: string) => void;
  /** Record a "Withdraw to bank via PIX" activity. */
  recordPIXWithdrawActivity: (amount: number, pixKey?: string) => void;
}

const PayoutDemoContext = createContext<PayoutDemoContextValue | null>(null);

export function PayoutDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PayoutDemoState>(getSSRSafeState);
  const [prepaidBalance, setPrepaidBalance] = useState<number>(
    getSSRSafePrepaidBalance
  );
  const [activities, setActivities] = useState<ActivityItem[]>(
    getSSRSafeActivities
  );
  const [highlightUpcoming, setHighlightUpcoming] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadedState = loadState();
    const loadedPrepaid = loadPrepaidBalance();
    let loadedActivities = loadActivities();
    
    // If no activities exist yet, generate dummy ones based on the prepaid balance
    if (loadedActivities.length === 0) {
      loadedActivities = resetActivitiesStore(loadedPrepaid);
    }
    
    setState(loadedState);
    setPrepaidBalance(loadedPrepaid);
    setActivities(loadedActivities);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (state.lastRequestedAt == null) {
      setHighlightUpcoming(false);
      return;
    }
    setHighlightUpcoming(true);
    const t = setTimeout(
      () => setHighlightUpcoming(false),
      HIGHLIGHT_DURATION_MS
    );
    return () => clearTimeout(t);
  }, [state.lastRequestedAt]);

  const recordPayoutRequest = useCallback((amount: number) => {
    setState((prev) => recordPayoutRequestStore(prev, amount));
    // Add activity for "Get paid"
    setActivities((prev) => addActivity(prev, createGetPaidActivity(amount)));
  }, []);

  const addFunds = useCallback((amount: number) => {
    setPrepaidBalance((prev) => addFundsToPrepaid(prev, amount));
  }, []);

  const recordAddFundsActivity = useCallback((amount: number) => {
    setActivities((prev) => addActivity(prev, createAddFundsActivity(amount)));
  }, []);

  const recordWithdrawActivity = useCallback((amount: number, walletAddress: string) => {
    setActivities((prev) => addActivity(prev, createWithdrawActivity(amount, walletAddress)));
  }, []);

  const recordPIXWithdrawActivity = useCallback((amount: number, pixKey?: string) => {
    setActivities((prev) => addActivity(prev, createPIXWithdrawActivity(amount, pixKey)));
  }, []);

  const resetPayoutDemo = useCallback(() => {
    const newState = resetPayoutStateStore();
    const newPrepaid = resetPrepaidBalanceStore();
    const newActivities = resetActivitiesStore(newPrepaid);
    setState(newState);
    setPrepaidBalance(newPrepaid);
    setActivities(newActivities);
    setHighlightUpcoming(false);
  }, []);

  const value: PayoutDemoContextValue = useMemo(
    () => ({
      state,
      highlightUpcoming,
      isHydrated,
      recordPayoutRequest,
      resetPayoutDemo,
      prepaidBalance,
      addFunds,
      activities,
      recordAddFundsActivity,
      recordWithdrawActivity,
      recordPIXWithdrawActivity,
    }),
    [
      state,
      highlightUpcoming,
      isHydrated,
      recordPayoutRequest,
      resetPayoutDemo,
      prepaidBalance,
      addFunds,
      activities,
      recordAddFundsActivity,
      recordWithdrawActivity,
      recordPIXWithdrawActivity,
    ]
  );

  return (
    <PayoutDemoContext.Provider value={value}>
      {children}
    </PayoutDemoContext.Provider>
  );
}

export function usePayoutDemo(): PayoutDemoContextValue {
  const ctx = useContext(PayoutDemoContext);
  if (!ctx) {
    throw new Error("usePayoutDemo must be used within PayoutDemoProvider");
  }
  return ctx;
}

export function usePayoutDemoOptional(): PayoutDemoContextValue | null {
  return useContext(PayoutDemoContext);
}
