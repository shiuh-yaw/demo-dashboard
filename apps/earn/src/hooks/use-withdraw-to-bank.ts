"use client";

/**
 * Hook for withdrawing USDC to bank via BlindPay PIX
 *
 * BlindPay Payout Flow:
 * 1. Create quote (POST /quotes) - returns quote_id, amounts, BlindPay contract addresses
 * 2. Approve tokens (ERC-20 approve to BlindPay's smart contract)
 * 3. Execute payout (POST /payouts/evm) - BlindPay pulls tokens and initiates fiat transfer
 *
 * PIX settlements typically complete in ~5 minutes.
 *
 * Test scenarios (development instances):
 * - Amount 666.00 → Failed status
 * - Amount 777.00 → Refunded status
 * - Other amounts → Auto-completed
 *
 * Reference: https://www.blindpay.com/docs/essentials/payouts
 */

import { useState, useCallback } from "react";
import { blindpayApi } from "@/lib/api";
import { getEmbeddedWallet } from "@/lib/dynamic";

// Demo PIX bank account ID
// In production, this would come from user's linked bank accounts via BlindPay dashboard
// Bank account requires: type: "pix", name: "Display Name", pix_key: "user@email.com"
const DEMO_PIX_BANK_ACCOUNT_ID = "ba_demo_pix_account";

// Network for demo (Base Sepolia testnet)
const DEMO_NETWORK = "base_sepolia";

// Supported tokens for BlindPay
export type BlindPayToken = "USDC" | "USDT" | "USDB";

// Default token for demo
// USDB = BlindPay's testnet stablecoin (free to mint for testing)
// USDC/USDT = Production stablecoins
const DEFAULT_TOKEN: BlindPayToken = "USDB";

export interface WithdrawToBankParams {
  /** Amount in USD (will be converted to cents for API) */
  amountUSD: number;
  /** Optional: Override bank account ID for testing */
  bankAccountId?: string;
  /** Optional: Token to use (USDC, USDT, or USDB). Defaults to USDB for testnet */
  token?: BlindPayToken;
}

export interface PayoutQuote {
  quoteId: string;
  requestAmount: number;
  receiveAmount: number;
  fees: number;
  exchangeRate: number;
  expiresAt: string;
  /** Currency the receiver will get (e.g., BRL for PIX) */
  receiverCurrency: string;
}

export interface WithdrawToBankResult {
  payoutId: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  receiverAmount?: number;
  quoteId: string;
  /** Estimated time for PIX: ~5 minutes */
  estimatedCompletionMinutes?: number;
}

export interface UseWithdrawToBankOptions {
  onSuccess?: (result: WithdrawToBankResult) => void;
  onError?: (error: Error) => void;
  onQuoteReceived?: (quote: PayoutQuote) => void;
}

export function useWithdrawToBank(options: UseWithdrawToBankOptions = {}) {
  const [isPending, setIsPending] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [result, setResult] = useState<WithdrawToBankResult | null>(null);

  /**
   * Get a quote for the PIX withdrawal
   * Quote is valid for 5 minutes
   */
  const getQuote = useCallback(
    async (params: WithdrawToBankParams): Promise<PayoutQuote> => {
      setIsQuoting(true);
      setError(null);
      setQuote(null);

      try {
        // Get embedded wallet address to pass to API
        const embeddedWallet = getEmbeddedWallet();
        if (!embeddedWallet?.address) {
          throw new Error("No embedded wallet found. Please ensure you have a wallet created.");
        }

        const response = await blindpayApi.createPayoutQuote({
          bank_account_id: params.bankAccountId || DEMO_PIX_BANK_ACCOUNT_ID,
          currency_type: "sender", // User specifies send amount
          cover_fees: false, // Receiver pays fees (most common)
          request_amount: params.amountUSD, // API expects dollars, will convert to cents
          network: DEMO_NETWORK,
          token: params.token || DEFAULT_TOKEN,
          wallet_address: embeddedWallet.address,
        });

        const quoteData: PayoutQuote = {
          quoteId: response.quote_id,
          requestAmount: response.request_amount,
          receiveAmount: response.receive_amount,
          fees: response.fees,
          exchangeRate: response.exchange_rate,
          expiresAt: response.expires_at,
          receiverCurrency: "BRL", // PIX is Brazil, always BRL
        };

        setQuote(quoteData);
        options.onQuoteReceived?.(quoteData);
        return quoteData;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to get payout quote");
        setError(error);
        throw error;
      } finally {
        setIsQuoting(false);
      }
    },
    [options]
  );

  /**
   * Execute the payout using an existing quote
   * Note: In production, ERC-20 approval must happen before this
   * BlindPay will pull tokens from the sender's wallet
   */
  const executeWithdrawal = useCallback(
    async (quoteId: string): Promise<WithdrawToBankResult> => {
      setIsPending(true);
      setError(null);
      setResult(null);

      try {
        // Get embedded wallet address to pass to API
        const embeddedWallet = getEmbeddedWallet();
        if (!embeddedWallet?.address) {
          throw new Error("No embedded wallet found. Please ensure you have a wallet created.");
        }

        const response = await blindpayApi.executePayout({
          quote_id: quoteId,
          wallet_address: embeddedWallet.address,
        });

        const withdrawResult: WithdrawToBankResult = {
          payoutId: response.payout_id,
          status: response.status as WithdrawToBankResult["status"],
          receiverAmount: response.receive_amount,
          quoteId,
          estimatedCompletionMinutes: 5, // PIX is ~5 minutes
        };

        setResult(withdrawResult);
        options.onSuccess?.(withdrawResult);
        return withdrawResult;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to execute payout");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [options]
  );

  /**
   * Full PIX withdrawal flow: get quote → execute
   *
   * In a production environment with EOA wallets, you would need to:
   * 1. Get quote (includes BlindPay contract address)
   * 2. Call ERC-20 approve() with BlindPay's contract
   * 3. Execute payout
   *
   * For this demo with ZeroDev smart wallets:
   * - Token approval can be bundled in the UserOperation
   * - Or pre-approved for smoother UX
   */
  const withdrawToBank = useCallback(
    async (params: WithdrawToBankParams): Promise<WithdrawToBankResult> => {
      // Step 1: Get quote (valid for 5 minutes)
      const quoteData = await getQuote(params);

      // Step 2: Execute payout
      // Note: For demo, we assume tokens are pre-approved or approval is handled
      // In production with EOA wallets, add approval step here
      return executeWithdrawal(quoteData.quoteId);
    },
    [getQuote, executeWithdrawal]
  );

  /**
   * Check payout status (for polling)
   */
  const checkStatus = useCallback(
    async (payoutId: string): Promise<WithdrawToBankResult> => {
      try {
        const response = await blindpayApi.getPayoutStatus(payoutId);
        return {
          payoutId: response.payout_id,
          status: response.status as WithdrawToBankResult["status"],
          receiverAmount: response.receive_amount,
          quoteId: "", // Not returned from status endpoint
        };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to check payout status");
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsQuoting(false);
    setError(null);
    setQuote(null);
    setResult(null);
  }, []);

  return {
    // Actions
    withdrawToBank,
    getQuote,
    executeWithdrawal,
    checkStatus,
    reset,
    // State
    isPending,
    isQuoting,
    isLoading: isPending || isQuoting,
    error,
    quote,
    result,
  };
}
