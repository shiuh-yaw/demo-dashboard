/**
 * Deposit-address funding source catalog + helpers.
 *
 * `fromChainId` values are Dynamic's chain-id namespace for flow
 * sources ('1' = BTC, '101' = SOL per the SDK docstring; EVM chains
 * use their EVM ids; TRON uses its registered id). Distinct from the
 * settlement chain ids in lib/tokens.ts - do not conflate.
 *
 * Selection is one step: each option is a (chain, asset) pair, not a
 * bare chain, because the quote's fromAmount is denominated in the
 * asset the user must send.
 */

import type { Chain } from "@dynamic-labs-sdk/client";
import { PublicKey } from "@solana/web3.js";
import { USDC_BASE, USDC_SOLANA, ETH_ETHEREUM } from "./tokens";

export interface DepositAddressSourceOption {
  key: string;
  label: string;
  sublabel: string;
  chainName: Chain;
  fromChainId: string;
  /**
   * Omitted for native assets - getFlowQuote defaults to the chain's
   * native token when no fromTokenAddress is passed.
   */
  tokenAddress?: string;
  tokenDecimals: number;
  symbol: string;
  logoURI: string;
}

export const DEPOSIT_ADDRESS_SOURCE_OPTIONS: readonly DepositAddressSourceOption[] =
  [
    {
      key: "btc",
      label: "BTC",
      sublabel: "on Bitcoin",
      chainName: "BTC",
      fromChainId: "1",
      tokenDecimals: 8,
      symbol: "BTC",
      logoURI: "https://api.iconify.design/cryptocurrency/btc.svg",
    },
    {
      key: "eth",
      label: "ETH",
      sublabel: "on Ethereum",
      chainName: "EVM",
      fromChainId: "1",
      tokenDecimals: ETH_ETHEREUM.decimals,
      symbol: "ETH",
      logoURI:
        ETH_ETHEREUM.logoURI ??
        "https://api.iconify.design/cryptocurrency/eth.svg",
    },
    {
      key: "usdc-base",
      label: "USDC",
      sublabel: "on Base",
      chainName: "EVM",
      fromChainId: String(USDC_BASE.chainId),
      tokenAddress: USDC_BASE.address,
      tokenDecimals: USDC_BASE.decimals,
      symbol: "USDC",
      logoURI:
        USDC_BASE.logoURI ??
        "https://api.iconify.design/cryptocurrency/usdc.svg",
    },
    {
      key: "usdc-solana",
      label: "USDC",
      sublabel: "on Solana",
      chainName: "SOL",
      fromChainId: "101",
      tokenAddress: USDC_SOLANA.address,
      tokenDecimals: USDC_SOLANA.decimals,
      symbol: "USDC",
      logoURI:
        USDC_SOLANA.logoURI ??
        "https://api.iconify.design/cryptocurrency/usdc.svg",
    },
    // No TRON entry (fromChainId "728126428", USDT TRC-20): Dynamic's
    // bridging layer rejects TRON -> EVM deposit-address routes.
  ];

/**
 * Full-precision decimal for a base-unit amount string. The widget's
 * display formatter caps at 6 decimals for readability; "send exactly"
 * copy must carry every digit or the deposit under-pays and is never
 * detected. Returns null for non-integer input.
 */
export function rawAmountToDecimal(
  raw: string,
  decimals: number,
): string | null {
  if (!/^\d+$/.test(raw)) return null;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** Screen title for the awaiting screen. Native assets drop the network,
 *  which their own ticker already implies ("Send BTC", not on Bitcoin). */
export function depositAddressSendTitle(
  option: DepositAddressSourceOption,
): string {
  if (!option.tokenAddress) return `Send ${option.symbol}`;
  return `Send ${option.symbol} ${option.sublabel}`;
}

export type DepositAddressFlowStatus =
  "waiting" | "confirmed" | "expired" | "failed";

/**
 * Poll classifier for deposit-address flows. There is no submit step:
 * the flow sits in "quoted" until Dynamic detects the inbound transfer,
 * then advances to "source_confirmed". Addresses expire after 48h,
 * surfaced by the API as executionState "expired".
 */
export function classifyDepositAddressFlow(flow: {
  executionState?: string;
  settlementState?: string;
}): DepositAddressFlowStatus {
  if (flow.executionState === "expired") return "expired";
  if (
    flow.executionState === "failed" ||
    flow.executionState === "cancelled" ||
    flow.settlementState === "failed"
  ) {
    return "failed";
  }
  if (
    flow.executionState === "source_confirmed" ||
    flow.settlementState === "completed"
  ) {
    return "confirmed";
  }
  return "waiting";
}

/**
 * Settlement destination for deposit-address flows. No wallet is
 * connected in this path, so the destination cannot be resolved at
 * runtime - it must be a configured address (EVM). When unset, the
 * deposit-address row is hidden.
 */
export const DEPOSIT_ADDRESS_DESTINATION: string | undefined =
  process.env.NEXT_PUBLIC_FLOW_DEPOSIT_DESTINATION || undefined;

const BTC_ADDRESS_PATTERN =
  /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/;
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function isSolanaAddress(address: string): boolean {
  try {
    // Rejects the base58 lengths BTC legacy addresses share with
    // Solana keys - only a real 32-byte key survives.
    return new PublicKey(address).toBase58() === address;
  } catch {
    return false;
  }
}

/**
 * Shape check for an operator-supplied refund address. The bridge
 * refunds on the source chain, so an address from the wrong family is
 * rejected downstream - catch it before the flow is created. BTC and
 * EVM are format-only (no bech32 / EIP-55 checksum verification), so a
 * typo inside a well-formed address still passes.
 */
export function isValidRefundAddress(chain: Chain, address: string): boolean {
  if (chain === "BTC") return BTC_ADDRESS_PATTERN.test(address);
  if (chain === "EVM") return EVM_ADDRESS_PATTERN.test(address);
  if (chain === "SOL") return isSolanaAddress(address);
  return false;
}
