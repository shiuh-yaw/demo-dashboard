/**
 * API Client for demo-dashboard endpoints
 *
 * Provides typed API client functions for calling demo-dashboard backend.
 */

import { env } from "@/env";
import { getAuthToken as getDynamicToken } from "@/lib/dynamic";

const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL;

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get authentication token from Dynamic SDK
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    return await getDynamicToken();
  } catch {
    return null;
  }
}

/**
 * Create authenticated fetch request
 */
async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add Dynamic environment ID header
  if (env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID) {
    headers["x-dynamic-environment-id"] =
      env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      text
    );
  }

  return response;
}

/**
 * Safely parse JSON response with error handling
 */
async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    const text = await response.text();
    throw new ApiError(
      `Expected JSON but received ${contentType}`,
      response.status,
      response.statusText,
      text.substring(0, 200)
    );
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    const text = await response.text();
    throw new ApiError(
      `Failed to parse JSON response: ${
        error instanceof Error ? error.message : String(error)
      }`,
      response.status,
      response.statusText,
      text.substring(0, 200)
    );
  }
}

// Type definitions for API responses
export interface PayoutQuote {
  quote_id: string;
  request_amount: number;
  receive_amount: number;
  fees: number;
  exchange_rate: number;
  expires_at: string;
}

export interface PayoutStatus {
  payout_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  request_amount: number;
  receive_amount?: number;
  fees?: number;
  transaction_hash?: string;
  error?: string;
}

export interface ExchangeRates {
  from: string;
  to: string;
  amount: number;
  receive_amount: number;
  exchange_rate: number;
  fees: number;
  currency_type: "sender" | "receiver";
}

export interface Payment {
  id: string;
  creator_id: string;
  amount: number;
  source: string;
  status: string;
  created_at: string;
}

/**
 * Generate a random ID for mock responses
 */
function generateMockId(prefix: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix;
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Simulate network delay for more realistic mock responses
 */
async function mockDelay(ms: number = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * BlindPay API Client (Mock-only for demo)
 *
 * This is a stub implementation that returns mock responses.
 * For real BlindPay integration, see:
 * - examples/nextjs-global-payments-blindpay
 * - demo-dashboard/src/app/api/blindpay
 */
export const blindpayApi = {
  /**
   * Create payout quote (mock)
   */
  async createPayoutQuote(data: {
    bank_account_id: string;
    currency_type: "sender" | "receiver";
    cover_fees: boolean;
    request_amount: number;
    network: string;
    token: string;
    wallet_address?: string;
  }): Promise<PayoutQuote> {
    await mockDelay();
    const fees = data.request_amount * 0.02; // 2% fee
    const exchangeRate = 5.15; // USD to BRL rate
    const receiveAmount = (data.request_amount - fees) * exchangeRate;

    return {
      quote_id: generateMockId("quote_"),
      request_amount: data.request_amount,
      receive_amount: Math.round(receiveAmount * 100) / 100,
      fees: Math.round(fees * 100) / 100,
      exchange_rate: exchangeRate,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  },

  /**
   * Execute payout (mock)
   */
  async executePayout(data: {
    quote_id: string;
    approval_tx_hash?: string;
    wallet_address?: string;
  }): Promise<PayoutStatus> {
    await mockDelay(1500);

    return {
      payout_id: generateMockId("payout_"),
      status: "processing",
      request_amount: 0,
      receive_amount: 0,
      transaction_hash: `0x${generateMockId("")}${generateMockId("")}`,
    };
  },

  /**
   * Get payout status (mock)
   */
  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    await mockDelay(500);

    return {
      payout_id: payoutId,
      status: "completed",
      request_amount: 0,
      receive_amount: 0,
    };
  },

  /**
   * Get exchange rates (mock)
   */
  async getRates(params: {
    from: string;
    to: string;
    amount: number;
    currency_type: "sender" | "receiver";
    bank_account_id?: string;
    network?: string;
    cover_fees?: boolean;
  }): Promise<ExchangeRates> {
    await mockDelay(300);
    const exchangeRate = 5.15;
    const fees = params.amount * 0.02;
    const receiveAmount = (params.amount - fees) * exchangeRate;

    return {
      from: params.from,
      to: params.to,
      amount: params.amount,
      receive_amount: Math.round(receiveAmount * 100) / 100,
      exchange_rate: exchangeRate,
      fees: Math.round(fees * 100) / 100,
      currency_type: params.currency_type,
    };
  },
};

/**
 * Payments API Client (for mock payments)
 */
export const paymentsApi = {
  /**
   * Get payment history
   */
  async getPayments(): Promise<Payment[]> {
    const response = await authenticatedFetch("/api/payments");
    return parseJsonResponse<Payment[]>(response);
  },

  /**
   * Simulate payment (admin only)
   */
  async simulatePayment(data: {
    creator_id: string;
    amount: number;
    source: string;
  }): Promise<Payment> {
    const response = await authenticatedFetch("/api/payments/simulate", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return parseJsonResponse<Payment>(response);
  },
};
