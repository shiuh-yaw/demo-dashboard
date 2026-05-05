/**
 * Shared BlindPay request/response types.
 *
 * Mirrors the surface of the previous `apps/dashboard/src/lib/services/blindpay.ts`
 * implementation so the dashboard's API routes can swap their imports without
 * any consumer-visible behavior change.
 *
 * Reference: https://www.blindpay.com/docs/getting-started/overview
 */

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

// ---------------------------------------------------------------------------
// Payouts (stablecoin -> fiat)
// ---------------------------------------------------------------------------

export interface PayoutQuoteRequest {
  bank_account_id: string;
  currency_type: CurrencyType;
  cover_fees: boolean;
  request_amount: number; // cents
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

// ---------------------------------------------------------------------------
// Payins (fiat -> stablecoin)
// ---------------------------------------------------------------------------

export interface PayinQuoteRequest {
  blockchain_wallet_id: string;
  currency_type: CurrencyType;
  cover_fees: boolean;
  request_amount: number; // cents
  payment_method: PaymentMethod;
  token: Currency;
}

export interface BlindpayBankDetails {
  account_number: string;
  routing_number?: string;
  account_type?: string;
  bank_name?: string;
  [key: string]: unknown;
}

export interface PayinQuoteResponse {
  id: string;
  payin_quote_id: string;
  request_amount: number;
  receiver_amount: number;
  fee: number;
  token: Currency;
  blindpay_bank_details?: BlindpayBankDetails;
  memo_code?: string;
  [key: string]: unknown;
}

export interface PayinExecuteRequest {
  payin_quote_id: string;
}

export interface PayinResponse {
  id: string;
  status: string;
  blindpay_bank_details?: BlindpayBankDetails;
  memo_code?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Rates
// ---------------------------------------------------------------------------

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
