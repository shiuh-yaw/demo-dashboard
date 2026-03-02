"use client";

/**
 * Hook for managing BlindPay KYC demo state
 *
 * Provides reactive state management for the KYC demo store,
 * following the same patterns as other demo hooks in this project.
 */

import { useState, useEffect, useCallback } from "react";
import type { BlindPayKYCState } from "@/lib/blindpay-kyc-demo-store";
import {
  loadState,
  completeKYCSetup,
  resetKYCState,
  isKYCComplete,
  getBankAccountId,
  getSSRSafeKYCState,
} from "@/lib/blindpay-kyc-demo-store";

export function useBlindPayKYC() {
  // Use SSR-safe state for initial render to avoid hydration mismatch
  const [state, setState] = useState<BlindPayKYCState>(getSSRSafeKYCState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage after hydration
  useEffect(() => {
    setState(loadState());
    setIsHydrated(true);
  }, []);

  /**
   * Complete KYC setup with auto-generated dummy data
   */
  const completeSetup = useCallback(
    (bankData?: {
      bankName?: string;
      pixKey?: string;
      holderName?: string;
    }) => {
      const newState = completeKYCSetup(bankData);
      setState(newState);
      return newState;
    },
    [],
  );

  /**
   * Reset KYC state
   */
  const reset = useCallback(() => {
    const newState = resetKYCState();
    setState(newState);
    return newState;
  }, []);

  /**
   * Refresh state from localStorage
   * Useful if state was updated elsewhere
   */
  const refresh = useCallback(() => {
    setState(loadState());
  }, []);

  return {
    // State
    state,
    isHydrated,
    isComplete: isKYCComplete(state),
    bankAccountId: getBankAccountId(state),
    receiverId: state.receiverId,
    kycStatus: state.kycStatus,
    bankDetails: state.bankDetails,
    // Actions
    completeSetup,
    reset,
    refresh,
  };
}
