/**
 * Shared formatting utilities for the Visa Direct demo.
 */

/**
 * Truncate an Ethereum-style address to `0xABCD...1234` format.
 * Returns the original string if it's already short or contains "...".
 */
export function truncateAddress(addr: string): string {
  if (addr.includes("...")) return addr;
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
