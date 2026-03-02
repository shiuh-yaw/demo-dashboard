"use client";

import { useState, useCallback, useMemo } from "react";

/**
 * Options for the useAmountInput hook
 */
interface UseAmountInputOptions {
  /** Maximum allowed amount (defaults to Infinity) */
  maxAmount?: number;
  /** Minimum allowed amount (defaults to 0) */
  minAmount?: number;
  /** Initial amount value */
  initialAmount?: string;
  /** Number of decimal places allowed (defaults to 2) */
  decimalPlaces?: number;
}

/**
 * Validation result for amount input
 */
interface AmountValidation {
  isValid: boolean;
  error: string | null;
}

/**
 * Hook for managing amount input with validation.
 * Handles decimal input formatting, min/max validation, and "Use max" functionality.
 *
 * This hook consolidates the duplicated amount validation logic that was
 * previously repeated across add-funds-modal, withdraw-to-bank-modal, and withdraw-to-wallet-modal.
 *
 * @example
 * ```tsx
 * const {
 *   amount,
 *   amountNumber,
 *   setAmount,
 *   handleUseMax,
 *   validation,
 *   reset,
 * } = useAmountInput({ maxAmount: 1000, minAmount: 1 });
 *
 * <Input
 *   value={amount}
 *   onChange={(e) => setAmount(e.target.value)}
 * />
 * <Button onClick={handleUseMax}>Use max</Button>
 * {!validation.isValid && <span>{validation.error}</span>}
 * ```
 */
export function useAmountInput(options: UseAmountInputOptions = {}) {
  const {
    maxAmount = Infinity,
    minAmount = 0,
    initialAmount = "",
    decimalPlaces = 2,
  } = options;

  const [amount, setAmountRaw] = useState(initialAmount);

  /**
   * Validate and set amount - only allows valid decimal numbers
   */
  const setAmount = useCallback(
    (value: string) => {
      // Allow empty string
      if (value === "") {
        setAmountRaw("");
        return;
      }

      // Build regex based on decimal places
      // Allows: digits, optional decimal point, optional digits after decimal
      const decimalRegex =
        decimalPlaces > 0
          ? new RegExp(`^\\d*\\.?\\d{0,${decimalPlaces}}$`)
          : /^\d*$/;

      // Only update if valid decimal format
      if (decimalRegex.test(value)) {
        setAmountRaw(value);
      }
    },
    [decimalPlaces],
  );

  /**
   * Parse amount as number
   */
  const amountNumber = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  /**
   * Set to max amount
   */
  const handleUseMax = useCallback(() => {
    if (Number.isFinite(maxAmount)) {
      setAmountRaw(maxAmount.toFixed(decimalPlaces));
    }
  }, [maxAmount, decimalPlaces]);

  /**
   * Validate current amount
   */
  const validation = useMemo((): AmountValidation => {
    // Empty is not valid but no error message (user hasn't entered anything)
    if (amount === "") {
      return { isValid: false, error: null };
    }

    const num = amountNumber;

    if (num <= 0) {
      return { isValid: false, error: "Amount must be greater than 0" };
    }

    if (num < minAmount) {
      return {
        isValid: false,
        error: `Minimum amount is ${minAmount.toLocaleString()}`,
      };
    }

    if (num > maxAmount) {
      return {
        isValid: false,
        error: `Maximum amount is ${maxAmount.toLocaleString()}`,
      };
    }

    return { isValid: true, error: null };
  }, [amount, amountNumber, minAmount, maxAmount]);

  /**
   * Check if amount exceeds max (for "insufficient balance" style messages)
   */
  const exceedsMax = useMemo(() => {
    return amountNumber > maxAmount;
  }, [amountNumber, maxAmount]);

  /**
   * Check if amount is valid for submission
   */
  const canSubmit = useMemo(() => {
    return validation.isValid && amountNumber > 0;
  }, [validation.isValid, amountNumber]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setAmountRaw(initialAmount);
  }, [initialAmount]);

  return {
    // State
    amount,
    amountNumber,
    validation,
    exceedsMax,
    canSubmit,
    // Actions
    setAmount,
    handleUseMax,
    reset,
  };
}
