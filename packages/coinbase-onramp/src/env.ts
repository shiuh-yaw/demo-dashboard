/**
 * @dynamic-demos/coinbase-onramp — environment + endpoint resolution.
 *
 * Sandbox-by-default per DECISIONS.md D-005. Production opt-in is explicit
 * by passing `env: 'production'` to the client factory.
 *
 * Coinbase CDP exposes the same host (`api.cdp.coinbase.com`) for both
 * sandbox and production; the `isSandbox` request flag selects sandbox
 * routing on the server. We still surface the environment as a typed
 * value so callers commit to a deliberate choice and so the package can
 * grow distinct host/path overrides without breaking consumers.
 */

export type CoinbaseOnrampEnvironment = "sandbox" | "production";

export interface CoinbaseOnrampEndpoint {
  /** Hostname used for JWT signing and HTTP requests. */
  host: string;
  /** API base path under the host (no trailing slash). */
  basePath: string;
  /** Whether requests should set `isSandbox: true` on payloads. */
  isSandbox: boolean;
}

const DEFAULT_HOST = "api.cdp.coinbase.com";
const DEFAULT_BASE_PATH = "/platform/v2/onramp";

export function resolveCoinbaseOnrampEndpoint(
  env: CoinbaseOnrampEnvironment,
): CoinbaseOnrampEndpoint {
  return {
    host: DEFAULT_HOST,
    basePath: DEFAULT_BASE_PATH,
    isSandbox: env !== "production",
  };
}
