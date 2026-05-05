/**
 * @dynamic-demos/coinbase-onramp
 *
 * Coinbase Onramp REST client + webhook helpers extracted from
 * apps/dashboard/src/lib/coinbase. Sandbox-by-default (D-005).
 */

// Environment + endpoint resolution
export {
  resolveCoinbaseOnrampEndpoint,
  type CoinbaseOnrampEndpoint,
  type CoinbaseOnrampEnvironment,
} from "./env";

// Client + high-level operations
export {
  CoinbaseError,
  createCoinbaseOnrampClient,
  createOnrampOrder,
  type CoinbaseOnrampClient,
  type CreateCoinbaseOnrampClientOptions,
} from "./client";

// Schemas
export {
  createOnrampOrderApiSchema,
  createOnrampOrderValidationSchema,
} from "./schemas";

// Types
export type {
  CoinbaseOrder,
  CoinbaseOrderResponse,
  CoinbasePaymentLink,
  CoinbaseTokenRequest,
  CreateOnrampOrderApiParams,
  CreateOnrampOrderParams,
  OnrampOrderResponse,
} from "./types";

// State mapping (stub until Phase 1E lands)
export {
  mapCoinbaseOnrampStatus,
  type CanonicalTransactionStatePlaceholder,
  type CoinbaseOnrampOrderStatus,
} from "./state-mapping";

// Webhooks
export {
  COINBASE_ONRAMP_SIGNATURE_HEADER,
  normalizeCoinbaseOnrampEvent,
  verifyCoinbaseOnrampWebhookSignature,
  type CoinbaseOnrampWebhookEvent,
  type NormalizedCoinbaseOnrampEvent,
  type VerifyCoinbaseOnrampWebhookSignatureInput,
} from "./webhooks";
