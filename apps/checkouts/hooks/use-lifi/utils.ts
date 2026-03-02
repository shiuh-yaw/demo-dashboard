/**
 * Shared utilities for LI.FI integration
 *
 * Common functions used by both EVM and Solana providers.
 *
 * NOTE: All API calls (routes, status) go through the dashboard API.
 * The LI.FI SDK is ONLY used for swap execution (executeRoute).
 */

import { createConfig } from "@lifi/sdk";

/**
 * Configure LI.FI SDK for route execution.
 *
 * This only configures the SDK - it does NOT make API calls.
 * The SDK is used exclusively for executing swaps via executeRoute().
 * All route fetching and status checking goes through the dashboard API.
 *
 * The integrator is provided by the dashboard API response to ensure
 * consistency between route fetching and execution.
 *
 * @param providers - Wallet providers (EVM and/or Solana)
 * @param options - Configuration options including integrator from dashboard
 */
export function configureLiFi(
  providers: Parameters<typeof createConfig>[0]["providers"],
  options: { integrator: string; rpcUrls?: Record<number, string[]> },
): void {
  createConfig({
    integrator: options.integrator,
    disableVersionCheck: true,
    ...(options.rpcUrls && { rpcUrls: options.rpcUrls }),
    // NOTE: integrator fee is set in the dashboard API,
    // monitor to ensure we see the fee.
    // routeOptions: { fee: options.integratorFee },
    providers,
  });
}
