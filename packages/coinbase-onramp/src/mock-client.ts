/**
 * MockCoinbaseOnrampClient — shape-only mock for tests and non-network demos.
 *
 * Mirrors {@link CoinbaseOnrampClient} exactly so a `MockCoinbaseOnrampClient`
 * is interchangeable with a real client in callers that only need the
 * surface to compile + resolve. Methods return shaped placeholders; they do
 * not exercise real Coinbase API behavior.
 *
 * Sandbox-only by construction — there is no production mock (D-005).
 */

import { resolveCoinbaseOnrampEndpoint, type CoinbaseOnrampEndpoint } from "./env";
import type { CoinbaseOnrampClient } from "./client";
import type { CoinbaseTokenRequest } from "./types";

export class MockCoinbaseOnrampClient implements CoinbaseOnrampClient {
  readonly env = "sandbox" as const;
  readonly endpoint: CoinbaseOnrampEndpoint =
    resolveCoinbaseOnrampEndpoint("sandbox");

  async generateToken(
    _requestMethod: CoinbaseTokenRequest["requestMethod"],
    _requestPath: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    return "mock-jwt-token";
  }

  async request<TResponse = unknown, TBody = unknown>(
    _descriptor: CoinbaseTokenRequest<TBody>,
  ): Promise<TResponse> {
    return {} as TResponse;
  }
}
