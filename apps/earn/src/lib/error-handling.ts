"use client";

import { toast } from "sonner";

/**
 * Standard error types for the application
 */
export type ErrorType =
  | "validation"
  | "network"
  | "transaction"
  | "auth"
  | "unknown";

/**
 * Structured error result
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
}

/**
 * Parse an error into a user-friendly message
 */
export function parseError(error: unknown): AppError {
  if (error instanceof Error) {
    // Check for specific error types
    const message = error.message.toLowerCase();

    if (message.includes("insufficient") || message.includes("balance")) {
      return { type: "validation", message: error.message, originalError: error };
    }

    if (message.includes("network") || message.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your connection.",
        originalError: error,
      };
    }

    if (
      message.includes("wallet") ||
      message.includes("zerodev") ||
      message.includes("transaction")
    ) {
      return { type: "transaction", message: error.message, originalError: error };
    }

    if (message.includes("auth") || message.includes("unauthorized")) {
      return {
        type: "auth",
        message: "Please log in to continue.",
        originalError: error,
      };
    }

    return { type: "unknown", message: error.message, originalError: error };
  }

  if (typeof error === "string") {
    return { type: "unknown", message: error };
  }

  return { type: "unknown", message: "An unexpected error occurred" };
}

/**
 * Show an error toast with consistent styling
 */
export function showErrorToast(error: unknown, customMessage?: string): void {
  const appError = parseError(error);
  const message = customMessage || appError.message;

  toast.error(message, {
    duration: 5000,
    position: "bottom-right",
  });
}

/**
 * Show a success toast with consistent styling
 */
export function showSuccessToast(message: string): void {
  toast.success(message, {
    duration: 3000,
    position: "bottom-right",
  });
}

/**
 * Show an info toast with consistent styling
 */
export function showInfoToast(message: string): void {
  toast.info(message, {
    duration: 3000,
    position: "bottom-right",
  });
}

/**
 * Show a loading toast that returns a dismiss function
 */
export function showLoadingToast(message: string): () => void {
  const toastId = toast.loading(message, {
    position: "bottom-right",
  });

  return () => toast.dismiss(toastId);
}

/**
 * Handle errors consistently across the app
 *
 * @param error - The error to handle
 * @param options - Error handling options
 * @returns The parsed error for further handling if needed
 */
export function handleError(
  error: unknown,
  options: {
    /** Show a toast notification */
    showToast?: boolean;
    /** Custom message to show (overrides parsed message) */
    customMessage?: string;
    /** Log to console */
    logToConsole?: boolean;
    /** Callback for additional handling */
    onError?: (error: AppError) => void;
  } = {}
): AppError {
  const {
    showToast = true,
    customMessage,
    logToConsole = true,
    onError,
  } = options;

  const appError = parseError(error);

  if (logToConsole) {
    console.error("[Error]", appError.type, appError.message, error);
  }

  if (showToast) {
    showErrorToast(error, customMessage);
  }

  if (onError) {
    onError(appError);
  }

  return appError;
}

/**
 * Wrap an async function with consistent error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Parameters<typeof handleError>[1]
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  };
}
