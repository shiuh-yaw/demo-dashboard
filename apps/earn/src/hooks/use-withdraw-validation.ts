"use client";

import { useMemo } from "react";

export interface WithdrawValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Custom hook for validating withdraw amounts
 */
export function useWithdrawValidation(
  amount: string,
  availableAmount: number,
  hasSelectedWallet: boolean
) {
  return useMemo((): WithdrawValidationResult => {
    if (!amount) {
      return {
        isValid: false,
        error: hasSelectedWallet ? undefined : "Please select a wallet",
      };
    }

    if (!hasSelectedWallet) {
      return {
        isValid: false,
        error: "Please select a wallet",
      };
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        isValid: false,
        error: "Please enter a valid amount",
      };
    }

    if (numAmount > availableAmount) {
      return {
        isValid: false,
        error: `Amount exceeds available balance of ${availableAmount.toFixed(
          2
        )}`,
      };
    }

    return { isValid: true };
  }, [amount, availableAmount, hasSelectedWallet]);
}
