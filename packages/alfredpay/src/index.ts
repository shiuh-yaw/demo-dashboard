/**
 * @dynamic-demos/alfredpay
 *
 * Direct REST integration for alfredPay (LATAM payment processor).
 *
 * The Fireblocks-mediated DVP path for the same partner lives at
 * `packages/fireblocks/src/providers/alfredpay.ts` (Phase 1A). This package
 * is the **direct REST** path: it talks to alfredPay's HTTP API at
 * `https://api.alfredpay.io` (production) or `https://api.sandbox.alfredpay.io`
 * (sandbox).
 *
 * @see https://alfredpay.io/documentation
 * @see https://alfredpay.readme.io
 */

// Environment + endpoint resolution
export {
  resolveAlfredpayBaseUrl,
  ALFREDPAY_SANDBOX_BASE_URL,
  ALFREDPAY_PRODUCTION_BASE_URL,
} from "./env";
export type { AlfredpayEnvironment } from "./env";

// Client factory + offramp helpers
export {
  createAlfredpayClient,
  createOfframp,
  getOfframpStatus,
} from "./client";

// Types
export { AlfredpayApiError } from "./types";
export type {
  AlfredpayClient,
  AlfredpayBeneficiary,
  AlfredpayCountry,
  AlfredpayCreateOfframpParams,
  AlfredpayOfframp,
  AlfredpayRail,
  AlfredpaySourceCurrency,
  AlfredpayStatus,
  CreateAlfredpayClientOptions,
} from "./types";

// Webhook signature verification + canonical event normalization
import * as webhooksNs from "./webhooks";
export const webhooks: {
  verifySignature: typeof webhooksNs.verifySignature;
  normalize: typeof webhooksNs.normalize;
} = {
  verifySignature: webhooksNs.verifySignature,
  normalize: webhooksNs.normalize,
};
export type {
  AlfredpayWebhookEvent,
  AlfredpayCanonicalEvent,
  VerifyAlfredpayWebhookOptions,
} from "./webhooks";

// Provider status → canonical TransactionState mapping
export {
  mapAlfredpayStatusToCanonical,
  CANONICAL_TRANSACTION_STATES,
} from "./state-mapping";
export type { CanonicalTransactionState } from "./state-mapping";
