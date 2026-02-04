/**
 * BlindPay Service
 *
 * Service layer for BlindPay API integration.
 * Handles payout and payin operations, quotes, and rate fetching.
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

import { env } from "@/env";

// =============================================================================
// TYPES
// =============================================================================

export type Network =
  | "base_sepolia"
  | "base"
  | "ethereum"
  | "arbitrum"
  | "polygon"
  | "stellar"
  | "tron";
export type Currency = "USDC" | "USDT" | "USDB";
export type FiatCurrency = "USD" | "BRL" | "MXN" | "COP" | "ARS";
export type CurrencyType = "sender" | "receiver";
export type PaymentMethod = "ach" | "wire" | "pix" | "sepa";

export interface PayoutQuoteRequest {
  bank_account_id: string;
  currency_type: CurrencyType;
  cover_fees: boolean;
  request_amount: number; // in cents
  network: Network;
  token: Currency;
}

export interface PayoutQuoteResponse {
  id: string;
  quote_id: string;
  request_amount: number;
  receiver_amount: number;
  fee: number;
  network: Network;
  token: Currency;
  estimated_completion_time?: number;
  [key: string]: unknown;
}

export interface PayoutExecuteRequest {
  quote_id: string;
  sender_wallet_address: string;
}

export interface PayoutResponse {
  id: string;
  status: string;
  receiver_amount?: number;
  estimated_completion_time?: number;
  [key: string]: unknown;
}

export interface PayinQuoteRequest {
  blockchain_wallet_id: string;
  currency_type: CurrencyType;
  cover_fees: boolean;
  request_amount: number; // in cents
  payment_method: PaymentMethod;
  token: Currency;
}

export interface PayinQuoteResponse {
  id: string;
  payin_quote_id: string;
  request_amount: number;
  receiver_amount: number;
  fee: number;
  token: Currency;
  blindpay_bank_details?: {
    account_number: string;
    routing_number?: string;
    account_type?: string;
    bank_name?: string;
    [key: string]: unknown;
  };
  memo_code?: string;
  [key: string]: unknown;
}

export interface PayinExecuteRequest {
  payin_quote_id: string;
}

export interface PayinResponse {
  id: string;
  status: string;
  blindpay_bank_details?: {
    account_number: string;
    routing_number?: string;
    account_type?: string;
    bank_name?: string;
    [key: string]: unknown;
  };
  memo_code?: string;
  [key: string]: unknown;
}

export interface RatesRequest {
  from: Currency;
  to: Currency | FiatCurrency;
  amount: number;
  currency_type: CurrencyType;
  bank_account_id?: string;
  network?: Network;
  cover_fees?: boolean;
}

export interface RatesResponse {
  from: Currency;
  to: Currency | FiatCurrency;
  rate: number;
  timestamp: number;
  blindpay_rate?: number;
  commercial_rate?: number;
  flat_fee?: number;
  percentage_fee?: number;
  result_amount?: number;
  request_amount: number;
  quote_type: "fx" | "full";
  full_quote?: unknown;
}

// =============================================================================
// BLINDPAY CLIENT
// =============================================================================

class BlindPayClient {
  private readonly apiUrl: string;
  private readonly instanceId: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = env.BLINDPAY_API_URL;
    this.instanceId = env.BLINDPAY_INSTANCE_ID || "";
    this.apiKey = env.BLINDPAY_API_KEY || "";

    if (!this.instanceId || !this.apiKey) {
      console.warn(
        "BlindPay credentials not configured. BLINDPAY_INSTANCE_ID and BLINDPAY_API_KEY are required."
      );
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private getBaseUrl(): string {
    return `${this.apiUrl}/instances/${this.instanceId}`;
  }

  /**
   * Create a payout quote
   * Step 1 of payout flow - get quote before token approval
   */
  async createPayoutQuote(
    request: PayoutQuoteRequest
  ): Promise<PayoutQuoteResponse> {
    const response = await fetch(`${this.getBaseUrl()}/quotes`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        bank_account_id: request.bank_account_id,
        currency_type: request.currency_type,
        cover_fees: request.cover_fees,
        request_amount: request.request_amount,
        network: request.network,
        token: request.token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payout quote failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Execute a payout
   * Step 2 of payout flow - after token approval
   */
  async executePayout(request: PayoutExecuteRequest): Promise<PayoutResponse> {
    const response = await fetch(`${this.getBaseUrl()}/payouts/evm`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        quote_id: request.quote_id,
        sender_wallet_address: request.sender_wallet_address,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payout execution failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get payout status
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
    const response = await fetch(`${this.getBaseUrl()}/payouts/${payoutId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payout status failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Create a payin quote
   * Step 1 of payin flow - get quote with banking details
   */
  async createPayinQuote(
    request: PayinQuoteRequest
  ): Promise<PayinQuoteResponse> {
    const response = await fetch(`${this.getBaseUrl()}/payin-quotes`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        blockchain_wallet_id: request.blockchain_wallet_id,
        currency_type: request.currency_type,
        cover_fees: request.cover_fees,
        request_amount: request.request_amount,
        payment_method: request.payment_method,
        token: request.token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payin quote failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Execute a payin
   * Step 2 of payin flow - after fiat deposit
   */
  async executePayin(request: PayinExecuteRequest): Promise<PayinResponse> {
    const response = await fetch(`${this.getBaseUrl()}/payins/evm`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        payin_quote_id: request.payin_quote_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payin execution failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get payin status
   */
  async getPayinStatus(payinId: string): Promise<PayinResponse> {
    const response = await fetch(`${this.getBaseUrl()}/payins/${payinId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay payin status failed: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get exchange rates
   * Can return FX quote or full quote depending on bank account availability
   */
  async getRates(request: RatesRequest): Promise<RatesResponse> {
    // Try FX quote first
    try {
      const fxResponse = await fetch(`${this.getBaseUrl()}/quotes/fx`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          from: request.from,
          to: request.to,
          request_amount: Math.round(request.amount),
          currency_type: request.currency_type,
        }),
      });

      if (fxResponse.ok) {
        const fxData = await fxResponse.json();
        return {
          from: request.from,
          to: request.to,
          rate: fxData.result_amount / request.amount,
          timestamp: Date.now(),
          blindpay_rate: fxData.blindpay_quotation / 100,
          commercial_rate: fxData.commercial_quotation / 100,
          flat_fee: fxData.instance_flat_fee,
          percentage_fee: fxData.instance_percentage_fee / 100,
          result_amount: fxData.result_amount,
          request_amount: request.amount,
          quote_type: "fx",
        };
      }

      // If FX quote fails with 402, try full quote if bank account provided
      if (
        fxResponse.status === 402 &&
        request.bank_account_id &&
        request.network
      ) {
        const fullResponse = await fetch(`${this.getBaseUrl()}/quotes`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            bank_account_id: request.bank_account_id,
            currency_type: request.currency_type,
            cover_fees: request.cover_fees || false,
            request_amount: Math.round(request.amount),
            network: request.network,
            token: request.from,
          }),
        });

        if (fullResponse.ok) {
          const fullData = await fullResponse.json();
          return {
            from: request.from,
            to: request.to,
            rate: 1,
            timestamp: Date.now(),
            quote_type: "full",
            full_quote: fullData,
            request_amount: request.amount,
          };
        }
      }

      const errorText = await fxResponse.text();
      throw new Error(
        `BlindPay rates failed: ${fxResponse.status} - ${errorText}`
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to fetch BlindPay rates");
    }
  }
}

export const blindpayClient = new BlindPayClient();
