import { isAddress } from "viem";
import { PublicKey } from "@solana/web3.js";

/**
 * Validate that `text` is a bare wallet address for the given send-screen chain.
 *
 * - EVM: viem `isAddress` with `strict: false` so all-lowercase / non-checksummed
 *   addresses (as typically encoded in QR codes) are accepted.
 * - Non-EVM (Solana): the address must construct a valid `PublicKey`.
 *
 * Anything else — payment URIs, URLs, arbitrary text, an address for the wrong
 * chain — returns false. No URI parsing is performed.
 */
export function isValidAddress(text: string, chain: string): boolean {
  const value = text.trim();
  if (!value) return false;

  if (chain === "EVM") {
    return isAddress(value, { strict: false });
  }

  try {
    // Throws on invalid length / non-base58 input (e.g. a 0x EVM address).
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
