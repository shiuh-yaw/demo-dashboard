import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { env } from "@/env";
import type {
  CoinbaseOrderResponse,
  CoinbaseTokenRequest,
  CreateOnrampOrderParams,
  OnrampOrderResponse,
} from "./types";

/**
 * Custom error class for Coinbase API-related errors.
 *
 * Extends the base Error class with HTTP status code information
 * and optional reference to the original error that caused this one.
 *
 * @example
 * ```typescript
 * throw new CoinbaseError("Invalid API credentials", 401, originalError);
 * ```
 */
export class CoinbaseError extends Error {
  /**
   * HTTP status code associated with this error
   */
  public readonly statusCode: number;

  /**
   * Original error that caused this CoinbaseError (if applicable)
   */
  public readonly originalError?: Error;

  constructor(
    message: string,
    statusCode: number = 500,
    originalError?: Error
  ) {
    super(message);
    this.name = "CoinbaseError";
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * Service class for interacting with Coinbase APIs.
 *
 * This class provides a clean interface for making authenticated requests
 * to Coinbase's Commerce Platform APIs, specifically handling onramp order creation.
 *
 * Features:
 * - JWT-based authentication using Coinbase CDP SDK
 * - Automatic token generation and management
 * - Comprehensive error handling with CoinbaseError
 * - Type-safe request/response handling
 *
 * @example
 * ```typescript
 * const coinbaseService = new CoinbaseService();
 * const order = await coinbaseService.createOnrampOrder(orderParams);
 * ```
 */
export class CoinbaseService {
  /**
   * Coinbase API key for authentication
   */
  private readonly apiKey: string;

  /**
   * Coinbase API secret for JWT signing
   */
  private readonly apiSecret: string;

  /**
   * Default JWT token expiry time in seconds (2 minutes)
   */
  private readonly defaultTokenExpiry: number = 120;

  /**
   * Creates a new CoinbaseService instance.
   *
   * @param apiKey - Optional Coinbase API key (defaults to env.COINBASE_API_KEY)
   * @param apiSecret - Optional Coinbase API secret (defaults to env.COINBASE_API_SECRET)
   *
   * @throws {CoinbaseError} If required environment variables are missing
   */
  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || env.COINBASE_API_KEY;
    this.apiSecret = apiSecret || env.COINBASE_API_SECRET;
  }

  /**
   * Generates a JWT token for Coinbase API authentication
   */
  private async generateToken(
    requestMethod: string,
    requestHost: string,
    requestPath: string,
    expiresIn: number = this.defaultTokenExpiry
  ): Promise<string> {
    try {
      const token = await generateJwt({
        apiKeyId: this.apiKey,
        apiKeySecret: this.apiSecret,
        requestMethod,
        requestHost,
        requestPath,
        expiresIn,
      });

      console.log("[CoinbaseService] Generated JWT");
      return token;
    } catch (error) {
      console.error("[CoinbaseService] Error generating JWT token", { error });
      throw new CoinbaseError(
        "Failed to generate authentication token",
        500,
        error instanceof Error
          ? error
          : new Error("Unknown token generation error")
      );
    }
  }

  /**
   * Makes an authenticated request to the Coinbase API
   */
  private async makeRequest<TResponse = unknown, TBody = unknown>(
    requestData: CoinbaseTokenRequest<TBody>
  ): Promise<TResponse> {
    const { requestMethod, requestHost, requestPath, requestBody } =
      requestData;

    try {
      // Generate JWT token for this request
      const token = await this.generateToken(
        requestMethod,
        requestHost,
        requestPath
      );

      // Construct the full URL
      const url = `https://${requestHost}${requestPath}`;

      console.log("[CoinbaseService] Making Coinbase API request");

      // Make the HTTP request
      const response = await fetch(url, {
        method: requestMethod,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      // Parse response
      const responseData = await response.json();

      console.log("[CoinbaseService] Coinbase API request completed", {
        status: response.status,
        success: response.ok,
      });

      console.log(responseData);
      console.log(response);

      // Throw error for unsuccessful responses
      if (!response.ok) {
        throw new CoinbaseError(
          `Coinbase API request failed: ${
            responseData.message || "Unknown error"
          }`,
          response.status
        );
      }

      return responseData;
    } catch (error) {
      console.error("[CoinbaseService] Error making Coinbase API request", {
        error,
      });

      if (error instanceof CoinbaseError) throw error;

      throw new CoinbaseError(
        "Failed to make Coinbase API request",
        500,
        error instanceof Error ? error : new Error("Unknown API request error")
      );
    }
  }

  /**
   * Creates a cryptocurrency purchase order through Coinbase's onramp service.
   *
   * This method handles the complete flow of creating an onramp order:
   * 1. Generates a JWT token for authentication
   * 2. Makes an authenticated request to Coinbase's CDP API
   * 3. Validates and transforms the response
   * 4. Returns the onramp URL and order details
   *
   * @param orderParams - Parameters for creating the onramp order
   * @returns Promise resolving to onramp order response with URL and order ID
   *
   * @throws {CoinbaseError} If the API request fails or returns invalid data
   *
   */
  async createOnrampOrder(
    orderParams: CreateOnrampOrderParams
  ): Promise<OnrampOrderResponse> {
    const requestMethod = "POST";
    const requestHost = "api.cdp.coinbase.com";
    const requestPath = "/platform/v2/onramp/orders";

    try {
      console.log("[CoinbaseService] Creating onramp order");
      const orderResponse = await this.makeRequest<
        CoinbaseOrderResponse,
        CreateOnrampOrderParams & { paymentMethod: string }
      >({
        requestMethod,
        requestHost,
        requestPath,
        requestBody: {
          ...orderParams,
          paymentMethod: "GUEST_CHECKOUT_APPLE_PAY",
        },
      });

      // Validate the response structure
      if (!orderResponse || typeof orderResponse !== "object") {
        throw new CoinbaseError("Invalid response structure from Coinbase API");
      }

      if (!orderResponse.order || !orderResponse.paymentLink) {
        throw new CoinbaseError(
          "Missing order or paymentLink in Coinbase response"
        );
      }

      // Transform to our standardized response format
      return {
        id: orderResponse.order.orderId,
        paymentUrl: orderResponse.paymentLink.url,
        status: orderResponse.order.status,
        createdAt: orderResponse.order.createdAt,
        orderDetails: orderResponse.order,
      };
    } catch (error) {
      console.error("[CoinbaseService] Error creating onramp order", { error });
      if (error instanceof CoinbaseError) throw error;
      throw new CoinbaseError(
        "Failed to create onramp order",
        500,
        error instanceof Error ? error : new Error("Unknown onramp order error")
      );
    }
  }
}

/**
 * Default instance of CoinbaseService for convenience
 */
export const coinbaseService = new CoinbaseService();
