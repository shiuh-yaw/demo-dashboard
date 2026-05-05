/**
 * BlindPay REST client.
 *
 * Construct via {@link createBlindpayClient}; the factory accepts an explicit
 * `env: 'sandbox' | 'production'` (D-005 sandbox-by-default) plus the
 * `instanceId` + `apiKey` BlindPay issues for that environment.
 *
 * Each public method maps 1:1 to a BlindPay endpoint and is the contract
 * consumers (the dashboard's `/api/blindpay/*` route handlers, future
 * orchestration paths) depend on.
 *
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

import type { BlindpayEnvironment } from "./env";
import { resolveBlindpayApiUrl } from "./env";
import type {
  PayinExecuteRequest,
  PayinQuoteRequest,
  PayinQuoteResponse,
  PayinResponse,
  PayoutExecuteRequest,
  PayoutQuoteRequest,
  PayoutQuoteResponse,
  PayoutResponse,
  RatesRequest,
  RatesResponse,
} from "./types";

export interface CreateBlindpayClientOptions {
  /**
   * Operating environment. Defaults to `'sandbox'` per D-005 — production
   * usage requires the consumer to opt in explicitly.
   */
  env?: BlindpayEnvironment;
  /** BlindPay instance ID (per-environment). */
  instanceId: string;
  /** BlindPay API key (per-environment). */
  apiKey: string;
  /** Override the API base URL (testing, alternate sandbox host). */
  apiUrl?: string;
  /**
   * Optional `fetch` implementation. Defaults to the global `fetch`. Useful
   * for tests and for environments where a custom HTTP transport is needed.
   */
  fetchImpl?: typeof fetch;
}

export interface BlindpayClient {
  readonly env: BlindpayEnvironment;
  readonly apiUrl: string;
  readonly instanceId: string;

  createPayoutQuote(request: PayoutQuoteRequest): Promise<PayoutQuoteResponse>;
  executePayout(request: PayoutExecuteRequest): Promise<PayoutResponse>;
  getPayoutStatus(payoutId: string): Promise<PayoutResponse>;

  createPayinQuote(request: PayinQuoteRequest): Promise<PayinQuoteResponse>;
  executePayin(request: PayinExecuteRequest): Promise<PayinResponse>;
  getPayinStatus(payinId: string): Promise<PayinResponse>;

  getRates(request: RatesRequest): Promise<RatesResponse>;
}

/**
 * Factory: create a BlindPay REST client.
 *
 * Throws when `instanceId` or `apiKey` is missing — credentials must be
 * resolved by the caller (typically from validated env vars).
 */
export function createBlindpayClient(
  options: CreateBlindpayClientOptions,
): BlindpayClient {
  const env: BlindpayEnvironment = options.env ?? "sandbox";

  if (!options.instanceId) {
    throw new Error(
      "BlindPay instanceId is required. Pass `instanceId` to createBlindpayClient.",
    );
  }
  if (!options.apiKey) {
    throw new Error(
      "BlindPay apiKey is required. Pass `apiKey` to createBlindpayClient.",
    );
  }

  const apiUrl = options.apiUrl ?? resolveBlindpayApiUrl(env);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    throw new Error(
      "BlindPay client requires a `fetch` implementation. Pass `fetchImpl` or run on a runtime providing global fetch.",
    );
  }

  const baseUrl = `${apiUrl}/instances/${options.instanceId}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
  };

  async function request<T>(
    path: string,
    init: RequestInit,
    operation: string,
  ): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `BlindPay ${operation} failed: ${response.status} - ${errorText}`,
      );
    }

    return (await response.json()) as T;
  }

  return {
    env,
    apiUrl,
    instanceId: options.instanceId,

    async createPayoutQuote(req) {
      return request<PayoutQuoteResponse>(
        "/quotes",
        {
          method: "POST",
          body: JSON.stringify({
            bank_account_id: req.bank_account_id,
            currency_type: req.currency_type,
            cover_fees: req.cover_fees,
            request_amount: req.request_amount,
            network: req.network,
            token: req.token,
          }),
        },
        "payout quote",
      );
    },

    async executePayout(req) {
      return request<PayoutResponse>(
        "/payouts/evm",
        {
          method: "POST",
          body: JSON.stringify({
            quote_id: req.quote_id,
            sender_wallet_address: req.sender_wallet_address,
          }),
        },
        "payout execution",
      );
    },

    async getPayoutStatus(payoutId) {
      return request<PayoutResponse>(
        `/payouts/${payoutId}`,
        { method: "GET" },
        "payout status",
      );
    },

    async createPayinQuote(req) {
      return request<PayinQuoteResponse>(
        "/payin-quotes",
        {
          method: "POST",
          body: JSON.stringify({
            blockchain_wallet_id: req.blockchain_wallet_id,
            currency_type: req.currency_type,
            cover_fees: req.cover_fees,
            request_amount: req.request_amount,
            payment_method: req.payment_method,
            token: req.token,
          }),
        },
        "payin quote",
      );
    },

    async executePayin(req) {
      return request<PayinResponse>(
        "/payins/evm",
        {
          method: "POST",
          body: JSON.stringify({ payin_quote_id: req.payin_quote_id }),
        },
        "payin execution",
      );
    },

    async getPayinStatus(payinId) {
      return request<PayinResponse>(
        `/payins/${payinId}`,
        { method: "GET" },
        "payin status",
      );
    },

    async getRates(req) {
      // Try FX quote first.
      const fxResponse = await fetchImpl(`${baseUrl}/quotes/fx`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: req.from,
          to: req.to,
          request_amount: Math.round(req.amount),
          currency_type: req.currency_type,
        }),
      });

      if (fxResponse.ok) {
        const fxData = (await fxResponse.json()) as {
          result_amount: number;
          blindpay_quotation: number;
          commercial_quotation: number;
          instance_flat_fee: number;
          instance_percentage_fee: number;
        };
        return {
          from: req.from,
          to: req.to,
          rate: fxData.result_amount / req.amount,
          timestamp: Date.now(),
          blindpay_rate: fxData.blindpay_quotation / 100,
          commercial_rate: fxData.commercial_quotation / 100,
          flat_fee: fxData.instance_flat_fee,
          percentage_fee: fxData.instance_percentage_fee / 100,
          result_amount: fxData.result_amount,
          request_amount: req.amount,
          quote_type: "fx",
        };
      }

      // Fall back to full quote when FX is unavailable (402) and a bank
      // account + network are supplied.
      if (fxResponse.status === 402 && req.bank_account_id && req.network) {
        const fullResponse = await fetchImpl(`${baseUrl}/quotes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bank_account_id: req.bank_account_id,
            currency_type: req.currency_type,
            cover_fees: req.cover_fees ?? false,
            request_amount: Math.round(req.amount),
            network: req.network,
            token: req.from,
          }),
        });

        if (fullResponse.ok) {
          const fullData = await fullResponse.json();
          return {
            from: req.from,
            to: req.to,
            rate: 1,
            timestamp: Date.now(),
            quote_type: "full",
            full_quote: fullData,
            request_amount: req.amount,
          };
        }
      }

      const errorText = await fxResponse.text();
      throw new Error(
        `BlindPay rates failed: ${fxResponse.status} - ${errorText}`,
      );
    },
  };
}
