import type { Token } from "@dynamic-demos/checkouts-widget";
import {
  ETH_BASE,
  ETH_ETHEREUM,
  SOL_SOLANA,
  USDC_BASE,
  USDC_ETHEREUM,
  USDC_POLYGON,
  USDC_SOLANA,
} from "@/lib/tokens";

/**
 * Settlement combinations the withdraw demo offers as recipient
 * destinations.
 *
 * Order matters — the first entry surfaces as the picker's
 * pre-selected default. Each row pairs a canonical `Token` (sourced
 * from `lib/tokens.ts`) with picker-only metadata (`chainKey`,
 * `chainLabel`, `chainFamily`) so the picker UI can group + label
 * without redeclaring token fields.
 *
 * The flat-row shape (`symbol`, `tokenAddress`, etc.) is preserved
 * for backwards compatibility with the picker components; values
 * derive from the linked Token via the `row()` factory below.
 */

type ChainFamily = "EVM" | "SOL";

/**
 * Pairs a canonical `Token` from the catalog with the picker-only
 * metadata each row needs. Returns a flat shape so existing picker
 * consumers (`ChainPicker`, `TokenPicker`, `WithdrawSubFlow`) keep
 * reading fields off the row directly. The `TChainFamily` generic
 * preserves the literal `"EVM"` / `"SOL"` narrowing on each row
 * instead of widening to the union.
 */
function row<TChainFamily extends ChainFamily>(
  token: Token,
  chainKey: string,
  chainLabel: string,
  chainFamily: TChainFamily,
) {
  return {
    symbol: token.symbol,
    chainKey,
    chainLabel,
    chainFamily,
    tokenAddress: token.address,
    chainId: token.chainId,
    decimals: token.decimals,
    iconUrl: token.logoURI ?? "",
  };
}

export const SETTLEMENT_OPTIONS = [
  row(USDC_BASE, "base", "Base", "EVM"),
  row(USDC_ETHEREUM, "ethereum", "Ethereum", "EVM"),
  row(USDC_POLYGON, "polygon", "Polygon", "EVM"),
  row(ETH_BASE, "base", "Base", "EVM"),
  row(ETH_ETHEREUM, "ethereum", "Ethereum", "EVM"),
  row(USDC_SOLANA, "solana", "Solana", "SOL"),
  row(SOL_SOLANA, "solana", "Solana", "SOL"),
];

export type SettlementOption = (typeof SETTLEMENT_OPTIONS)[number];

/**
 * Chain-level dedupe of SETTLEMENT_OPTIONS — feeds the chain picker
 * (step 1) so the user picks a network first, then sees only the
 * tokens available on that network (step 2).
 */
export const CHAIN_OPTIONS: Array<{
  chainKey: string;
  chainLabel: string;
  chainFamily: ChainFamily;
  chainId: number;
}> = SETTLEMENT_OPTIONS.filter(
  (o, i, arr) => arr.findIndex((x) => x.chainKey === o.chainKey) === i,
).map((o) => ({
  chainKey: o.chainKey,
  chainLabel: o.chainLabel,
  chainFamily: o.chainFamily,
  chainId: o.chainId,
}));

/**
 * USDC on Base — the active default for the platform embedded
 * wallet (deposit destination, withdraw source, Dashboard balance
 * asset). Re-exported from the canonical `lib/tokens.ts` catalog
 * so existing consumers keep working.
 */
export { USDC_BASE as USDC_ON_BASE };
