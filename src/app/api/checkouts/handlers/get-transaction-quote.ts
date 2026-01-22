/**
 * Get Transaction Quote Handler
 *
 * Fetches a quote from LI.FI and stores route data in the transaction atomically.
 * This combines quote fetching with transaction persistence in a single API call.
 */

import { transactionService } from "@/lib/services";
import { lifiService, LiFiError } from "@/lib/services/lifi";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { Status, type TransactionStatus } from "@/lib/types/dashboard";
import {
  getTransactionQuoteSchema,
  parseWithSchema,
  type GetTransactionQuoteInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

/**
 * LI.FI route response structure (from their API)
 */
interface LiFiRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: {
    address: string;
    chainId: number;
    symbol: string;
    decimals: number;
    name: string;
    logoURI?: string;
    priceUSD?: string;
    coinKey?: string;
    tags?: string[];
  };
  toToken: {
    address: string;
    chainId: number;
    symbol: string;
    decimals: number;
    name: string;
    logoURI?: string;
    priceUSD?: string;
    coinKey?: string;
    tags?: string[];
  };
  fromAmount: string;
  toAmount: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  gasCostUSD: string;
  steps: Array<{
    id: string;
    type: string;
    tool: string;
    action: {
      fromChainId: number;
      toChainId: number;
      fromToken: unknown;
      toToken: unknown;
      fromAmount: string;
    };
    estimate: {
      fromAmount: string;
      toAmount: string;
      toAmountMin: string;
      gasCosts: Array<{ amountUSD: string }>;
      feeCosts?: Array<{ name: string; amountUSD: string }>;
    };
  }>;
}

interface LiFiRoutesResponse {
  routes: LiFiRoute[];
}

export interface GetTransactionQuoteResult {
  quote: {
    route: LiFiRoute;
    integrator: string;
  };
  transaction: Transaction;
}

export async function handleGetTransactionQuote(
  rawInput: unknown
): Promise<GetTransactionQuoteResult> {
  const {
    checkoutId,
    txId,
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress,
    toAddress,
  } = parseWithSchema(getTransactionQuoteSchema, rawInput);

  // Verify transaction exists and belongs to checkout
  const existing = await transactionService.get(txId);
  if (!existing || existing.checkoutId !== checkoutId) {
    throw new NotFoundError("Transaction not found");
  }

  // Prevent updates to transactions that are already submitted, pending, or confirmed
  const immutableStatuses: TransactionStatus[] = [
    Status.SUBMITTED,
    Status.PENDING,
    Status.CONFIRMED,
  ];
  if (immutableStatuses.includes(existing.status)) {
    throw new ConflictError(
      `Cannot get quote for transaction with status "${existing.status}". Transaction is already in progress or completed.`
    );
  }

  // Fetch quote from LI.FI
  const lifiResult = await lifiService.getRoutes({
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress,
    toAddress,
  });

  // Parse LI.FI response
  // lifiResult.routes is the LI.FI API response object which contains a routes array
  const routesData = lifiResult.routes as LiFiRoutesResponse;
  if (!routesData.routes || routesData.routes.length === 0) {
    throw new Error("No routes found for this swap");
  }

  // Get the best route (first one, already sorted by LI.FI)
  const bestRoute = routesData.routes[0];

  // Extract tool from first step (if available)
  const tool = bestRoute.steps?.[0]?.tool;

  // Store route data in transaction atomically
  const transaction = await transactionService.addRouteData(txId, {
    walletAddress: fromAddress,
    fromToken: {
      address: bestRoute.fromToken.address,
      chainId: bestRoute.fromToken.chainId,
      symbol: bestRoute.fromToken.symbol,
      decimals: bestRoute.fromToken.decimals,
      name: bestRoute.fromToken.name,
      logoURI: bestRoute.fromToken.logoURI,
      priceUSD: bestRoute.fromToken.priceUSD,
      coinKey: bestRoute.fromToken.coinKey,
      tags: bestRoute.fromToken.tags,
    },
    toToken: {
      address: bestRoute.toToken.address,
      chainId: bestRoute.toToken.chainId,
      symbol: bestRoute.toToken.symbol,
      decimals: bestRoute.toToken.decimals,
      name: bestRoute.toToken.name,
      logoURI: bestRoute.toToken.logoURI,
      priceUSD: bestRoute.toToken.priceUSD,
      coinKey: bestRoute.toToken.coinKey,
      tags: bestRoute.toToken.tags,
    },
    fromAmount: bestRoute.fromAmount,
    toAmount: bestRoute.toAmount,
    tool,
  });

  return {
    quote: {
      route: bestRoute,
      integrator: lifiResult.integrator,
    },
    transaction,
  };
}

// Re-export types for route usage
export type { GetTransactionQuoteInput };
