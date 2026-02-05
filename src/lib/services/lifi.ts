/**
 * LI.FI Service
 *
 * Service layer for LI.FI API integration.
 * Handles quote fetching and transaction status tracking for cross-chain swaps.
 * Reference: https://docs.li.fi/
 */

import { env } from "@/env";

// =============================================================================
// TYPES
// =============================================================================

export type LiFiOrder = "CHEAPEST" | "FASTEST";

export interface LiFiQuoteRequest {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  /** Sender wallet address (should be lowercase to avoid validation errors) */
  fromAddress: string;
  /** Recipient wallet address (should be lowercase to avoid validation errors) */
  toAddress: string;
}

export interface LiFiQuoteOptions {
  order?: LiFiOrder;
  slippage?: number;
  maxPriceImpact?: number;
  integrator?: string;
  fee?: number;
}

/**
 * LI.FI Token structure
 */
export interface LiFiToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
  coinKey?: string;
}

/**
 * LI.FI Step structure (single step in a route)
 */
export interface LiFiStep {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LiFiToken;
    toToken: LiFiToken;
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
      token: LiFiToken;
    }>;
    feeCosts?: Array<{
      name: string;
      description?: string;
      percentage?: string;
      token: LiFiToken;
      amount: string;
      amountUSD: string;
      included: boolean;
    }>;
  };
  includedSteps?: LiFiStep[];
  transactionRequest?: unknown;
}

/**
 * Normalized route structure for internal use.
 *
 * This structure is compatible with the LiFi SDK's `executeRoute` function.
 * The `fromAddress` and `toAddress` fields are required at the route level
 * for the SDK to validate that the signing wallet matches the route.
 */
export interface LiFiRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: LiFiToken;
  toToken: LiFiToken;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  gasCostUSD: string;
  steps: LiFiStep[];
  /** Sender wallet address - required for SDK executeRoute validation */
  fromAddress: string;
  /** Recipient wallet address - required for SDK executeRoute validation */
  toAddress: string;
}

export interface LiFiQuoteResponse {
  route: LiFiRoute;
  integrator: string;
}

export interface LiFiStatusResult {
  status: "PENDING" | "DONE" | "FAILED" | "NOT_FOUND";
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

// =============================================================================
// LIFI CLIENT
// =============================================================================

class LiFiService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly integrator: string;
  private readonly defaultFee: number;

  constructor() {
    this.apiUrl = "https://li.quest/v1";
    this.apiKey = env.LIFI_API_KEY;
    this.integrator = "dynamic-widget-demo";
    this.defaultFee = 0.05; // 5%
  }

  private getHeaders(): Record<string, string> {
    return {
      "x-lifi-api-key": this.apiKey,
    };
  }

  /**
   * Get swap quote from LI.FI
   * Uses /quote endpoint which returns the best single-step route with transaction data ready to execute
   */
  async getQuote(
    request: LiFiQuoteRequest,
    options: LiFiQuoteOptions = {},
  ): Promise<LiFiQuoteResponse> {
    // Build query parameters for GET request
    const params = new URLSearchParams({
      fromChain: request.fromChainId.toString(),
      toChain: request.toChainId.toString(),
      fromToken: request.fromTokenAddress,
      toToken: request.toTokenAddress,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      order: options.order || "FASTEST",
      slippage: (options.slippage || 0.005).toString(),
      maxPriceImpact: (options.maxPriceImpact || 0.01).toString(),
      integrator: options.integrator || this.integrator,
      fee: (options.fee ?? this.defaultFee).toString(),
    });

    const url = `${this.apiUrl}/quote?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LiFiError(
        errorData.message || `LI.FI quote failed: ${response.status}`,
        response.status,
      );
    }

    const quote = (await response.json()) as LiFiStep;

    // The /quote endpoint returns a single Step object
    // Normalize it to our internal Route format
    const route: LiFiRoute = {
      id: quote.id,
      fromChainId: quote.action.fromChainId,
      toChainId: quote.action.toChainId,
      fromToken: quote.action.fromToken,
      toToken: quote.action.toToken,
      fromAmount: quote.action.fromAmount,
      toAmount: quote.estimate.toAmount,
      fromAmountUSD: quote.estimate.fromAmountUSD || "0",
      toAmountUSD: quote.estimate.toAmountUSD || "0",
      gasCostUSD: quote.estimate.gasCosts?.[0]?.amountUSD || "0",
      // Wrap the quote as a single step - the SDK handles includedSteps internally
      steps: [quote],
      // Include addresses from the request - required for SDK validation
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
    };

    return {
      route,
      integrator: this.integrator,
    };
  }

  /**
   * Check transaction status from LI.FI
   * Polls the status endpoint to track cross-chain transaction progress
   */
  async getStatus(
    txHash: string,
    fromChainId?: number,
    toChainId?: number,
  ): Promise<LiFiStatusResult> {
    const params = new URLSearchParams({ txHash });
    if (fromChainId) params.set("fromChain", fromChainId.toString());
    if (toChainId) params.set("toChain", toChainId.toString());

    try {
      const response = await fetch(`${this.apiUrl}/status?${params}`, {
        headers: this.getHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { status: "NOT_FOUND" };
        }
        const errorText = await response.text();
        throw new Error(
          `LI.FI status check failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      return {
        status: data.status,
        substatus: data.substatus,
        error: data.substatusMessage,
        lifiExplorerLink: data.lifiExplorerLink,
        bridgeExplorerLink: data.bridgeExplorerLink,
        sendingTxLink: data.sending?.txLink,
        receivingTxLink: data.receiving?.txLink,
      };
    } catch (error) {
      console.error("[LiFiService] Failed to check status:", error);
      // Treat errors as pending for retry
      return { status: "PENDING" };
    }
  }

  /**
   * Get the integrator name for SDK configuration
   */
  getIntegrator(): string {
    return this.integrator;
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class LiFiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "LiFiError";
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const lifiService = new LiFiService();
