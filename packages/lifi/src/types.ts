/**
 * Shared LI.FI types.
 *
 * Mirrors the subset of the LI.FI REST schema we consume. The full SDK
 * surface (`@lifi/sdk`) ships its own types — these are only the values
 * we hand back to consumers from the dashboard service layer and the
 * checkouts-app hooks.
 */

export type LifiOrder = "CHEAPEST" | "FASTEST";

export interface LifiQuoteRequest {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  /** Desired amount in destination token (raw, e.g., wei) - used for reverse quotes */
  toAmount: string;
  /** Sender wallet address (should be lowercase to avoid validation errors) */
  fromAddress: string;
  /** Recipient wallet address (should be lowercase to avoid validation errors) */
  toAddress: string;
}

export interface LifiQuoteOptions {
  order?: LifiOrder;
  slippage?: number;
  maxPriceImpact?: number;
  integrator?: string;
  fee?: number;
}

export interface LifiToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
  coinKey?: string;
}

export interface LifiStep {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
    slippage: number;
    fromAddress: string;
    toAddress: string;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    fromAmountUSD?: string;
    toAmountUSD?: string;
    gasCosts?: Array<{
      type: string;
      price?: string;
      estimate?: string;
      limit?: string;
      amount: string;
      amountUSD: string;
      token: LifiToken;
    }>;
    feeCosts?: Array<{
      name: string;
      description?: string;
      percentage?: string;
      token: LifiToken;
      amount: string;
      amountUSD: string;
      included: boolean;
    }>;
  };
  includedSteps?: LifiStep[];
  transactionRequest?: unknown;
}

/**
 * Normalized route structure for internal use.
 *
 * This structure is compatible with the LI.FI SDK's `executeRoute` function.
 * `fromAddress` / `toAddress` are required at the route level so the SDK
 * can validate that the signing wallet matches the route.
 */
export interface LifiRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: LifiToken;
  toToken: LifiToken;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  gasCostUSD: string;
  steps: LifiStep[];
  /** Sender wallet address - required for SDK executeRoute validation */
  fromAddress: string;
  /** Recipient wallet address - required for SDK executeRoute validation */
  toAddress: string;
}

export interface LifiQuoteResponse {
  route: LifiRoute;
  integrator: string;
}

/** Upstream LI.FI status string returned by `/status`. */
export type LifiStatusValue = "PENDING" | "DONE" | "FAILED" | "NOT_FOUND";

export interface LifiStatusResult {
  status: LifiStatusValue;
  substatus?: string;
  error?: string;
  /** LI.FI explorer URL for the transaction */
  lifiExplorerLink?: string;
  /** Bridge-specific explorer URL (if available) */
  bridgeExplorerLink?: string;
  /** Source chain transaction link */
  sendingTxLink?: string;
  /** Destination chain transaction link */
  receivingTxLink?: string;
}
