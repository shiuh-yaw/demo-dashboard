import { BASE_SEPOLIA_EXPLORER, BASE_SEPOLIA_ID } from "@/lib/constants";

/**
 * Block-explorer deep links. The card is Base-Sepolia-only, so an unknown
 * chain returns null (caller renders no link) rather than a wrong-chain URL.
 */
export function explorerAddressUrl(address: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/address/${address}`;
}

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string | undefined,
): string | null {
  if (!hash || chainId !== BASE_SEPOLIA_ID) return null;
  return `${BASE_SEPOLIA_EXPLORER}/tx/${hash}`;
}
