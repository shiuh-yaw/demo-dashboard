/**
 * @dynamic-demos/lifi
 *
 * Shared LI.FI bridge / swap integration. Wraps the public REST API
 * (`https://li.quest/v1`) for server-side quote fetching and status
 * polling, plus a thin SDK-config helper for browser-side route
 * execution via `@lifi/sdk`.
 */

// Environment
export { resolveLifiApiUrl, LIFI_DEFAULT_API_URL } from "./env";
export type { LifiEnvironment } from "./env";

// REST client
export { createLifiClient, getQuote, getStatus, LifiError } from "./client";
export type { LifiClient, CreateLifiClientOptions } from "./client";

// Browser SDK helper
export { configureLifi } from "./sdk-config";
export type { ConfigureLifiOptions } from "./sdk-config";

// Types
export type {
  LifiOrder,
  LifiQuoteRequest,
  LifiQuoteOptions,
  LifiQuoteResponse,
  LifiRoute,
  LifiStep,
  LifiToken,
  LifiStatusResult,
  LifiStatusValue,
} from "./types";

// State mapping (canonical state stub until Phase 1E)
export { mapLifiStatus, mapLifiStatusResult } from "./state-mapping";
export type { CanonicalLifiState } from "./state-mapping";

// Webhooks (placeholder — LI.FI does not deliver webhooks today)
export * as webhooks from "./webhooks";
