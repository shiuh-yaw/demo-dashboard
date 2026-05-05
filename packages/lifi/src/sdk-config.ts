/**
 * Browser-side LI.FI SDK configuration helper.
 *
 * The LI.FI SDK (`@lifi/sdk`) is used in browser contexts to execute
 * routes via `executeRoute`. Server-side / dashboard code talks directly
 * to the REST API (see `client.ts`) and never imports the SDK.
 *
 * `configureLifi` centralises the SDK config so every consumer uses the
 * same defaults (no version check, integrator string from the dashboard).
 */

import { createConfig } from "@lifi/sdk";

export interface ConfigureLifiOptions {
  integrator: string;
  rpcUrls?: Record<number, string[]>;
}

/**
 * Configure the LI.FI SDK for route execution.
 *
 * Note: the integrator string MUST match the value the dashboard used
 * when fetching the quote, otherwise LI.FI rejects the execution.
 */
export function configureLifi(
  providers: Parameters<typeof createConfig>[0]["providers"],
  options: ConfigureLifiOptions,
): void {
  createConfig({
    integrator: options.integrator,
    disableVersionCheck: true,
    ...(options.rpcUrls && { rpcUrls: options.rpcUrls }),
    providers,
  });
}
