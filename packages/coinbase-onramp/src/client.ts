/**
 * Coinbase Onramp REST client.
 *
 * Sandbox-by-default per DECISIONS.md D-005. Construct via
 * `createCoinbaseOnrampClient({ env, apiKey, apiSecret })`. The factory
 * returns a `CoinbaseOnrampClient` that exposes the high-level operations
 * this package supports today (`createOnrampOrder`).
 *
 * Authentication uses the official `@coinbase/cdp-sdk` JWT helper; the
 * generated bearer token is short-lived (default 120s) and scoped to a
 * single method+host+path tuple, matching Coinbase's signing requirements.
 */

import { generateJwt } from "@coinbase/cdp-sdk/auth";

import {
  resolveCoinbaseOnrampEndpoint,
  type CoinbaseOnrampEndpoint,
  type CoinbaseOnrampEnvironment,
} from "./env";
import type {
  CoinbaseOrderResponse,
  CoinbaseTokenRequest,
  CreateOnrampOrderParams,
  OnrampOrderResponse,
} from "./types";

const DEFAULT_TOKEN_EXPIRY_SECONDS = 120;
const DEFAULT_PAYMENT_METHOD = "GUEST_CHECKOUT_APPLE_PAY";

/**
 * Custom error class for Coinbase API failures. Carries the upstream HTTP
 * status code so route handlers can mirror it back to the caller.
 */
export class CoinbaseError extends Error {
  public readonly statusCode: number;
  public readonly originalError?: Error;

  constructor(message: string, statusCode = 500, originalError?: Error) {
    super(message);
    this.name = "CoinbaseError";
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export interface CreateCoinbaseOnrampClientOptions {
  /** Environment selector. Defaults to `'sandbox'` (D-005). */
  env?: CoinbaseOnrampEnvironment;
  /** Coinbase CDP API key id. Falls back to `COINBASE_API_KEY` env var. */
  apiKey?: string;
  /** Coinbase CDP API secret. Falls back to `COINBASE_API_SECRET` env var. */
  apiSecret?: string;
  /**
   * Optional injected fetch implementation — primarily for tests.
   * Defaults to the global `fetch`.
   */
  fetchImpl?: typeof fetch;
  /** Override JWT lifetime in seconds. Defaults to 120. */
  tokenExpirySeconds?: number;
}

export interface CoinbaseOnrampClient {
  readonly env: CoinbaseOnrampEnvironment;
  readonly endpoint: CoinbaseOnrampEndpoint;
  /**
   * Generate a JWT bearer token scoped to the supplied request descriptor.
   * Exposed primarily so consumers can attach the same auth to ad-hoc
   * requests not yet wrapped in a high-level helper.
   */
  generateToken(
    requestMethod: CoinbaseTokenRequest["requestMethod"],
    requestPath: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  /**
   * Issue an authenticated request against the configured endpoint.
   * Returns the parsed JSON body on success, throws `CoinbaseError`
   * on any non-2xx response.
   */
  request<TResponse = unknown, TBody = unknown>(
    request: CoinbaseTokenRequest<TBody>,
  ): Promise<TResponse>;
}

interface ResolvedClientConfig {
  env: CoinbaseOnrampEnvironment;
  endpoint: CoinbaseOnrampEndpoint;
  apiKey: string;
  apiSecret: string;
  fetchImpl: typeof fetch;
  tokenExpirySeconds: number;
}

function resolveConfig(
  options: CreateCoinbaseOnrampClientOptions,
): ResolvedClientConfig {
  const env = options.env ?? "sandbox";
  const endpoint = resolveCoinbaseOnrampEndpoint(env);

  const apiKey = options.apiKey ?? process.env.COINBASE_API_KEY;
  const apiSecret = options.apiSecret ?? process.env.COINBASE_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new CoinbaseError(
      "Coinbase Onramp credentials required (COINBASE_API_KEY, COINBASE_API_SECRET)",
      500,
    );
  }

  return {
    env,
    endpoint,
    apiKey,
    apiSecret,
    fetchImpl: options.fetchImpl ?? fetch,
    tokenExpirySeconds:
      options.tokenExpirySeconds ?? DEFAULT_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Construct a Coinbase Onramp client.
 *
 * Throws `CoinbaseError` synchronously when credentials are missing.
 */
export function createCoinbaseOnrampClient(
  options: CreateCoinbaseOnrampClientOptions = {},
): CoinbaseOnrampClient {
  const config = resolveConfig(options);

  async function generateToken(
    requestMethod: CoinbaseTokenRequest["requestMethod"],
    requestPath: string,
    expiresInSeconds: number = config.tokenExpirySeconds,
  ): Promise<string> {
    try {
      return await generateJwt({
        apiKeyId: config.apiKey,
        apiKeySecret: config.apiSecret,
        requestMethod,
        requestHost: config.endpoint.host,
        requestPath,
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      throw new CoinbaseError(
        "Failed to generate Coinbase authentication token",
        500,
        error instanceof Error
          ? error
          : new Error("Unknown token generation error"),
      );
    }
  }

  async function request<TResponse = unknown, TBody = unknown>(
    descriptor: CoinbaseTokenRequest<TBody>,
  ): Promise<TResponse> {
    const { requestMethod, requestHost, requestPath, requestBody } = descriptor;

    let token: string;
    try {
      token = await generateToken(requestMethod, requestPath);
    } catch (error) {
      if (error instanceof CoinbaseError) throw error;
      throw new CoinbaseError(
        "Failed to authenticate Coinbase request",
        500,
        error instanceof Error ? error : new Error("Unknown auth error"),
      );
    }

    const url = `https://${requestHost}${requestPath}`;
    let response: Response;
    try {
      response = await config.fetchImpl(url, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
      });
    } catch (error) {
      throw new CoinbaseError(
        "Coinbase API request failed before receiving a response",
        500,
        error instanceof Error ? error : new Error("Unknown network error"),
      );
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch (error) {
      throw new CoinbaseError(
        "Coinbase API returned a non-JSON response",
        response.status,
        error instanceof Error ? error : new Error("JSON parse error"),
      );
    }

    if (!response.ok) {
      const message =
        (typeof parsed === "object" &&
          parsed !== null &&
          "message" in parsed &&
          typeof (parsed as { message?: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : null) ?? "Unknown error";
      throw new CoinbaseError(
        `Coinbase API request failed: ${message}`,
        response.status,
      );
    }

    return parsed as TResponse;
  }

  return {
    env: config.env,
    endpoint: config.endpoint,
    generateToken,
    request,
  };
}

/**
 * Create a Coinbase Onramp purchase order.
 *
 * Returns a normalized `OnrampOrderResponse` that includes the hosted
 * payment URL (Apple Pay guest checkout) and the underlying order detail.
 */
export async function createOnrampOrder(
  client: CoinbaseOnrampClient,
  params: CreateOnrampOrderParams,
): Promise<OnrampOrderResponse> {
  const requestPath = `${client.endpoint.basePath}/orders`;
  const orderResponse = await client.request<
    CoinbaseOrderResponse,
    CreateOnrampOrderParams & { paymentMethod: string }
  >({
    requestMethod: "POST",
    requestHost: client.endpoint.host,
    requestPath,
    requestBody: {
      ...params,
      paymentMethod: DEFAULT_PAYMENT_METHOD,
    },
  });

  if (!orderResponse || typeof orderResponse !== "object") {
    throw new CoinbaseError("Invalid response structure from Coinbase API");
  }
  if (!orderResponse.order || !orderResponse.paymentLink) {
    throw new CoinbaseError(
      "Missing order or paymentLink in Coinbase response",
    );
  }

  return {
    id: orderResponse.order.orderId,
    paymentUrl: orderResponse.paymentLink.url,
    status: orderResponse.order.status,
    createdAt: orderResponse.order.createdAt,
    orderDetails: orderResponse.order,
  };
}
