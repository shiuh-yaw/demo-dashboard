/**
 * Get Transaction Quote Handler
 *
 * Fetches a quote from LI.FI and stores route data in the transaction atomically.
 * This combines quote fetching with transaction persistence in a single API call.
 */

import { transactionService } from "@/lib/services";
import { lifiService, type LiFiQuoteResponse } from "@/lib/services/lifi";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { Status, type TransactionStatus } from "@/lib/types/dashboard";
import {
  getTransactionQuoteSchema,
  parseWithSchema,
  type GetTransactionQuoteInput,
} from "@/lib/validation";
import type { Transaction } from "@/lib/types/dashboard";

export interface GetTransactionQuoteResult {
  quote: LiFiQuoteResponse;
  transaction: Transaction;
}

export async function handleGetTransactionQuote(
  rawInput: unknown,
): Promise<GetTransactionQuoteResult> {
  const {
    checkoutId,
    txId,
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    toAmount,
    fromAddress: rawFromAddress,
    toAddress: rawToAddress,
  } = parseWithSchema(getTransactionQuoteSchema, rawInput);

  // Normalize wallet addresses to lowercase to avoid LI.FI validation errors
  // LI.FI SDK is case-sensitive and will reject if addresses don't match exactly
  const fromAddress = rawFromAddress.toLowerCase();
  const toAddress = rawToAddress.toLowerCase();

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
      `Cannot get quote for transaction with status "${existing.status}". Transaction is already in progress or completed.`,
    );
  }

  // Fetch quote from LI.FI using toAmount (reverse quote)
  const quote = await lifiService.getQuote({
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    toAmount,
    fromAddress,
    toAddress,
  });

  if (!quote.route) {
    throw new Error("No route found for this swap");
  }

  // Extract tool from first step (if available)
  const tool = quote.route.steps?.[0]?.tool;

  // Store route data in transaction atomically
  const transaction = await transactionService.addRouteData(txId, {
    walletAddress: fromAddress,
    fromToken: {
      address: quote.route.fromToken.address,
      chainId: quote.route.fromToken.chainId,
      symbol: quote.route.fromToken.symbol,
      decimals: quote.route.fromToken.decimals,
      name: quote.route.fromToken.name,
      logoURI: quote.route.fromToken.logoURI,
      priceUSD: quote.route.fromToken.priceUSD,
      coinKey: quote.route.fromToken.coinKey,
    },
    toToken: {
      address: quote.route.toToken.address,
      chainId: quote.route.toToken.chainId,
      symbol: quote.route.toToken.symbol,
      decimals: quote.route.toToken.decimals,
      name: quote.route.toToken.name,
      logoURI: quote.route.toToken.logoURI,
      priceUSD: quote.route.toToken.priceUSD,
      coinKey: quote.route.toToken.coinKey,
    },
    fromAmount: quote.route.fromAmount,
    toAmount: quote.route.toAmount,
    tool,
  });

  return {
    quote,
    transaction,
  };
}

// Re-export types for route usage
export type { GetTransactionQuoteInput };
