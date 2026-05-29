/**
 * Formatting Utilities
 *
 * Shared formatting functions for currency, tokens, addresses, and balances.
 */

// =============================================================================
// RAW TOKEN AMOUNT FORMATTING (BigInt)
// =============================================================================

/**
 * Formats a raw token amount (e.g., wei) to human-readable format.
 * Uses BigInt for precision with large numbers.
 *
 * @param rawAmount - Amount in smallest unit (e.g., wei) as string
 * @param decimals - Token decimals (e.g., 18 for ETH, 6 for USDC)
 * @returns Formatted amount string (e.g., "1.234567")
 */
export function formatRawTokenAmount(
  rawAmount: string,
  decimals: number,
): string {
  const raw = BigInt(rawAmount);
  const divisor = BigInt(10 ** decimals);
  const wholePart = raw / divisor;
  const fractionalPart = raw % divisor;

  // Pad fractional part with leading zeros
  let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

  // Trim trailing zeros but keep at least 2 decimal places for display
  fractionalStr = fractionalStr.replace(/0+$/, "");
  if (fractionalStr.length < 2) {
    fractionalStr = fractionalStr.padEnd(2, "0");
  }

  // Limit to 6 decimal places for readability
  if (fractionalStr.length > 6) {
    fractionalStr = fractionalStr.slice(0, 6);
  }

  return `${wholePart}.${fractionalStr}`;
}

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Formats a number as USD currency (e.g., "$1,234.56")
 */
export function formatUsd(amount: number, includeSign = true): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSign ? `$${formatted}` : formatted;
}

/**
 * Formats a number as approximate USD (e.g., "~$1.23")
 */
export function formatApproxUsd(amount: number): string {
  return `~${formatUsd(amount)}`;
}

/**
 * Parses a USD string (e.g., "$1,234.56") to a number
 */
export function parseUsd(value: string): number {
  return parseFloat(value.replace(/[$,]/g, "")) || 0;
}

// =============================================================================
// TOKEN AMOUNT FORMATTING
// =============================================================================

/**
 * Formats a token amount to avoid scientific notation.
 * Preserves meaningful decimals while removing trailing zeros.
 *
 * @param amount - The token amount as a number
 * @param maxDecimals - Maximum decimal places (default: 8)
 * @returns Formatted string (e.g., "0.001234", "1234.5")
 */
export function formatTokenAmount(amount: number, maxDecimals = 8): string {
  if (amount === 0) return "0";

  // Use fixed notation with enough decimals for small amounts
  const formatted = amount.toFixed(maxDecimals);

  // Remove trailing zeros after decimal point
  // Keep at least the integer part
  return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/**
 * Formats a token balance for display.
 * Handles very small amounts with exponential notation.
 *
 * @param balance - The balance as a number
 * @returns Formatted string with appropriate precision
 */
export function formatBalance(balance: number): string {
  if (balance === 0) return "0";
  if (balance < 0.0001) return balance.toExponential(2);
  if (balance < 1) return balance.toFixed(6);
  if (balance < 1000) return balance.toFixed(4);
  return balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// =============================================================================
// ADDRESS FORMATTING
// =============================================================================

/**
 * Truncates an Ethereum address for display.
 *
 * @param address - Full address (e.g., "0x1234...5678")
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export function truncateAddress(
  address: string,
  startChars = 6,
  endChars = 4,
): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// =============================================================================
// ERROR MESSAGE FORMATTING
// =============================================================================

/**
 * Converts technical error messages into user-friendly text.
 * Handles common blockchain/swap error patterns.
 *
 * @param error - Error object or string
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Bundle/transaction errors
  if (
    lowerMessage.includes("no matching bundle") ||
    lowerMessage.includes("bundle id is unknown")
  ) {
    return "Transaction was cancelled or expired. Please try again.";
  }

  // Insufficient funds
  if (
    lowerMessage.includes("insufficient funds") ||
    lowerMessage.includes("insufficient balance")
  ) {
    return "Insufficient funds to complete this transaction.";
  }

  // Gas estimation failures
  if (
    lowerMessage.includes("gas required exceeds") ||
    lowerMessage.includes("out of gas")
  ) {
    return "Transaction requires more gas than available. Try a smaller amount.";
  }

  // Network errors
  if (
    lowerMessage.includes("network error") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("timeout")
  ) {
    return "Network connection issue. Please check your connection and try again.";
  }

  // Slippage errors
  if (
    lowerMessage.includes("slippage") ||
    lowerMessage.includes("price impact")
  ) {
    return "Price changed too much during the swap. Please try again.";
  }

  // Bridge errors
  if (lowerMessage.includes("bridge") && lowerMessage.includes("fail")) {
    return "Bridge transfer failed. Your funds are safe - please try again.";
  }

  // Cross-chain transfer timeout
  if (lowerMessage.includes("transfer timed out")) {
    return "Transfer is taking longer than expected. Check your wallet for status.";
  }

  // Route/quote errors
  if (lowerMessage.includes("no routes found")) {
    return "No swap route available for this token pair. Try a different amount.";
  }

  // Generic transaction failure
  if (lowerMessage.includes("transaction") && lowerMessage.includes("fail")) {
    return "Transaction failed. Please try again.";
  }

  // If message is too long or technical, provide generic message
  if (message.length > 100 || message.includes("0x") || message.includes("@")) {
    return "Something went wrong. Please try again.";
  }

  // Return cleaned up original message if it's short enough
  return message;
}

// =============================================================================
// TRANSACTION ERROR DETECTION
// =============================================================================

/**
 * Common patterns indicating user rejected a transaction.
 * Used to distinguish user cancellations from actual errors.
 */
const USER_REJECTION_PATTERNS = [
  "user rejected",
  "user denied",
  "rejected the request",
  "user cancelled",
  "user canceled",
  // LI.FI SDK errors that indicate cancellation
  "no matching bundle",
  "bundle id is unknown",
  "has not been submitted",
  "bundle expired",
] as const;

/**
 * Check if an error indicates the user rejected/cancelled a transaction.
 * This is not a true error - user intentionally cancelled.
 *
 * @param error - Error object or string to check
 * @returns true if the error is a user rejection
 *
 * @example
 * ```tsx
 * try {
 *   await sendTransaction();
 * } catch (err) {
 *   if (isUserRejection(err)) {
 *     onCancelled();
 *   } else {
 *     setError(formatErrorMessage(err));
 *   }
 * }
 * ```
 */
export function isUserRejection(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();

  return USER_REJECTION_PATTERNS.some((pattern) => message.includes(pattern));
}
