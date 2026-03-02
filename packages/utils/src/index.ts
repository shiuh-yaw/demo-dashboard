import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate wallet address for display
 * @param address - Full wallet address
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Truncated address like "0x1234...5678"
 */
export function truncateAddress(
  address: string,
  startLength = 6,
  endLength = 4
): string {
  if (!address) return "";
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format currency values
 * @param amount - Amount to format (string or number)
 * @param options - Formatting options
 * @returns Formatted currency string like "$1,234.56"
 */
export interface FormatCurrencyOptions {
  /** Whether to show the $ symbol (default: true) */
  symbol?: boolean;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Locale for number formatting (default: "en-US") */
  locale?: string;
}

export function formatCurrency(
  amount: string | number,
  options?: FormatCurrencyOptions
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return options?.symbol !== false ? "$0.00" : "0.00";

  const decimals = options?.decimals ?? 2;
  const locale = options?.locale ?? "en-US";

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);

  return options?.symbol !== false ? `$${formatted}` : formatted;
}

/**
 * Convert hex color to RGB values (space-separated)
 * @param hex - Hex color like "#FF0000" or "FF0000"
 * @returns RGB string like "255 0 0" for use in CSS variables
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0 0";
  return `${parseInt(result[1]!, 16)} ${parseInt(result[2]!, 16)} ${parseInt(result[3]!, 16)}`;
}

/**
 * Convert hex color to RGB object
 * @param hex - Hex color like "#FF0000"
 * @returns Object with r, g, b values or null if invalid
 */
export function hexToRgbObject(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
