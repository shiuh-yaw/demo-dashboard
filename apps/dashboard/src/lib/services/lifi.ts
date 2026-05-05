/**
 * LI.FI Service (thin shim).
 *
 * Wraps the `@dynamic-demos/lifi` package with a singleton wired up to
 * the dashboard's environment config. Real client logic lives in the
 * package — this file exists only so existing call sites
 * (`lifiService.getQuote(...)`, `lifiService.getStatus(...)`) keep
 * working until the broader transactions refactor lands.
 *
 * Reference: https://docs.li.fi/
 */

import { env } from "@/env";
import {
  createLifiClient,
  getQuote as packageGetQuote,
  getStatus as packageGetStatus,
  LifiError,
  type LifiClient,
  type LifiQuoteOptions,
  type LifiQuoteRequest,
  type LifiQuoteResponse,
  type LifiRoute,
  type LifiStatusResult,
  type LifiStep,
  type LifiToken,
} from "@dynamic-demos/lifi";

// =============================================================================
// LEGACY TYPE ALIASES
// =============================================================================
// The dashboard / checkouts widgets historically imported these names from
// this module. We preserve them as re-exports so the migration is mechanical.

export type LiFiOrder = "CHEAPEST" | "FASTEST";
export type LiFiQuoteRequest = LifiQuoteRequest;
export type LiFiQuoteOptions = LifiQuoteOptions;
export type LiFiToken = LifiToken;
export type LiFiStep = LifiStep;
export type LiFiRoute = LifiRoute;
export type LiFiQuoteResponse = LifiQuoteResponse;
export type LiFiStatusResult = LifiStatusResult;

export { LifiError as LiFiError };

// =============================================================================
// SERVICE WRAPPER
// =============================================================================

class LiFiService {
  private readonly client: LifiClient;

  constructor() {
    this.client = createLifiClient({
      // Sandbox-by-default per D-005. LI.FI does not currently expose a
      // separate sandbox host, so this discriminator is informational
      // until they ship one.
      env: "sandbox",
      apiKey: env.LIFI_API_KEY,
      integrator: "dynamic-widget-demo",
      defaultFee: 0.05,
    });
  }

  async getQuote(
    request: LiFiQuoteRequest,
    options: LiFiQuoteOptions = {},
  ): Promise<LiFiQuoteResponse> {
    return packageGetQuote(this.client, request, options);
  }

  async getStatus(
    txHash: string,
    fromChainId?: number,
    toChainId?: number,
  ): Promise<LiFiStatusResult> {
    return packageGetStatus(this.client, txHash, fromChainId, toChainId);
  }

  getIntegrator(): string {
    return this.client.integrator;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const lifiService = new LiFiService();
