/**
 * @dynamic-demos/blindpay
 *
 * BlindPay payouts/payins/rates client + webhook verifier. Sandbox-by-default
 * (D-005). Phase 1B extraction from `apps/dashboard/src/lib/services/blindpay.ts`.
 */

export {
  createBlindpayClient,
  type BlindpayClient,
  type CreateBlindpayClientOptions,
} from "./client";

export {
  DEFAULT_BLINDPAY_API_URL,
  resolveBlindpayApiUrl,
  type BlindpayEnvironment,
} from "./env";

export type {
  BlindpayBankDetails,
  Currency,
  CurrencyType,
  FiatCurrency,
  Network,
  PayinExecuteRequest,
  PayinQuoteRequest,
  PayinQuoteResponse,
  PayinResponse,
  PaymentMethod,
  PayoutExecuteRequest,
  PayoutQuoteRequest,
  PayoutQuoteResponse,
  PayoutResponse,
  RatesRequest,
  RatesResponse,
} from "./types";

export {
  CanonicalTransactionStatePlaceholder,
  mapBlindpayStatus,
  type BlindpayStatus,
} from "./state-mapping";

export * as webhooks from "./webhooks";
export type {
  BlindpayWebhookHeaders,
  BlindpayWebhookPayload,
  CanonicalEvent,
  CanonicalEventKind,
  VerifySignatureInput,
} from "./webhooks";
