/**
 * LI.FI Client Functions
 *
 * These client-side functions proxy ALL LI.FI API requests through the dashboard API.
 * Authentication is handled via the Dynamic JWT token from the SDK.
 *
 * IMPORTANT: This is the ONLY place where LI.FI API calls should be made.
 * The LI.FI SDK is ONLY used for swap execution (executeRoute), not for API calls.
 */

"use client";

import { post } from "@/lib/api/client";
import { formatRawTokenAmount } from "@/lib/format";
import type { GetRoutesParams, QuoteResult } from "@/lib/types";

// Re-export types for consumers
export type { QuoteResult } from "@/lib/types";

/**
 * Get swap quote for a transaction (fetches quote and stores route data atomically)
 * This is the preferred method when you have a transaction ID.
 */
export async function getTransactionQuote(
  checkoutId: string,
  transactionId: string,
  params: GetRoutesParams,
): Promise<{ data?: QuoteResult; error?: string }> {
  try {
    // Use post helper for consistent auth handling
    // Backend returns: { success: true, data: { quote: {...}, transaction: {...} } }
    // API client extracts the data field, so result.data = { quote: {...}, transaction: {...} }
    const result = await post<{
      quote: {
        integrator: string;
        route: {
          fromAmount: string;
          toAmount: string;
          toAmountUSD?: string;
          fromToken: { decimals: number };
          toToken: { decimals: number };
          gasCostUSD?: string;
          steps: Array<{
            estimate?: {
              feeCosts?: Array<{ name?: string; amountUSD?: string }>;
            };
          }>;
        };
      };
      transaction: unknown;
    }>(`/api/checkouts/${checkoutId}/transactions/${transactionId}/quote`, {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      toAmount: params.toAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
    });

    if (result.error) {
      return { error: result.error };
    }

    if (!result.data) {
      return { error: "No data in response" };
    }

    // Response format: { quote: {...}, transaction: {...} }
    const responseData = result.data;
    const quoteData = responseData.quote;
    const transaction = responseData.transaction;

    if (!quoteData || !transaction) {
      return { error: "Invalid response format: missing quote or transaction" };
    }
    const integrator = quoteData.integrator;
    const bestRoute = quoteData.route;

    // Format amounts from raw (wei) to human-readable
    const formattedFromAmount = formatRawTokenAmount(
      bestRoute.fromAmount,
      bestRoute.fromToken.decimals,
    );
    const formattedToAmount = formatRawTokenAmount(
      bestRoute.toAmount,
      bestRoute.toToken.decimals,
    );

    // Calculate total fees: gas cost + all fee costs from steps
    let totalFee = parseFloat(bestRoute.gasCostUSD || "0");
    let integratorFee = 0;

    for (const step of bestRoute.steps) {
      const feeCosts = step.estimate?.feeCosts || [];
      for (const fee of feeCosts) {
        const feeAmount = parseFloat(fee.amountUSD || "0");
        totalFee += feeAmount;

        // Track integrator fee separately (LI.FI names it with "Integrator" or similar)
        const feeName = fee.name?.toLowerCase() || "";
        if (feeName.includes("integrator")) {
          integratorFee += feeAmount;
        }
      }
    }

    return {
      data: {
        route: bestRoute as QuoteResult["route"],
        fromToken: bestRoute.fromToken as QuoteResult["fromToken"],
        toToken: bestRoute.toToken as QuoteResult["toToken"],
        fromAmount: formattedFromAmount,
        toAmount: formattedToAmount,
        toAmountUsd: bestRoute.toAmountUSD || "0",
        totalFeeUsd: totalFee.toFixed(4),
        integratorFeeUsd:
          integratorFee > 0 ? integratorFee.toFixed(4) : undefined,
        integrator,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get quote";
    return {
      error: errorMessage,
    };
  }
}
