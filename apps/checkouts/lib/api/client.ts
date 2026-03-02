/**
 * Dashboard API Client
 *
 * Shared HTTP client for dashboard API requests.
 * Handles authentication, error handling, and response parsing.
 */

"use client";

import { getAuthToken } from "@/lib/dynamicClient";
import { env } from "@/lib/env";
import type { ApiResponse } from "@/lib/types";

const DASHBOARD_API_URL = env.NEXT_PUBLIC_DASHBOARD_API_URL;

/**
 * HTTP methods supported by the client
 */
type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Request options for the API client
 */
interface RequestOptions {
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Skip authentication (for public endpoints) */
  skipAuth?: boolean;
  /** Cache mode */
  cache?: RequestCache;
}

/**
 * Result type for API calls
 */
type ApiResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

/**
 * Get authentication headers for dashboard API requests
 *
 * Always includes x-dynamic-environment-id header when available.
 * Includes Authorization header only when JWT token is present.
 */
function getAuthHeaders(): Record<string, string> {
  const jwtToken = getAuthToken();
  const envId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  const headers: Record<string, string> = {};

  // Always include environment ID if available (required by API)
  if (envId) headers["x-dynamic-environment-id"] = envId;

  // Include Authorization header only if JWT token is present
  if (jwtToken) headers.Authorization = `Bearer ${jwtToken}`;

  return headers;
}

/**
 * Make a request to the dashboard API
 *
 * @param method - HTTP method
 * @param path - API path (e.g., "/api/checkouts/123")
 * @param options - Request options
 * @returns API result with data or error
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { body, headers = {}, skipAuth = false, cache } = options;

  try {
    const url = `${DASHBOARD_API_URL}${path}`;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (!skipAuth) {
      Object.assign(requestHeaders, getAuthHeaders());
    }

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body !== undefined) fetchOptions.body = JSON.stringify(body);

    if (cache) fetchOptions.cache = cache;

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch {
        // If parsing fails, errorData stays empty
      }

      const errorMessage =
        errorData.error ||
        `Request failed: ${response.status} ${response.statusText}`;

      console.error(
        `[API Client] Request failed:`,
        JSON.stringify(
          {
            method,
            path,
            url,
            status: response.status,
            statusText: response.statusText,
            errorData,
            errorMessage,
          },
          null,
          2,
        ),
      );

      return {
        error: errorMessage,
      };
    }

    const rawResult = await response.json();

    // Handle wrapped format: { success: true, data: T }
    if ("success" in rawResult) {
      const result = rawResult as ApiResponse<T>;
      if (!result.success) {
        console.error(
          `[API Client] API returned error:`,
          JSON.stringify(
            {
              method,
              path,
              error: result.error,
              fullResult: result,
            },
            null,
            2,
          ),
        );
        return { error: result.error || "Request failed" };
      }

      if (result.data === undefined) {
        console.error(
          `[API Client] No data in response:`,
          JSON.stringify(
            {
              method,
              path,
              fullResult: result,
            },
            null,
            2,
          ),
        );
        return { error: "No data returned" };
      }

      return { data: result.data };
    }

    // Handle direct transaction format: { transaction: T, created?: boolean, message?: string }
    if ("transaction" in rawResult) {
      const transactionResult = rawResult as {
        transaction: T;
        created?: boolean;
        message?: string;
      };
      const transaction = transactionResult.transaction;

      // If the type T includes created/message, preserve the full object
      // This handles both cases: simple { transaction: T } and { transaction: T, created, message }
      if ("created" in rawResult || "message" in rawResult) {
        return { data: transactionResult as T };
      }

      return { data: transaction };
    }

    // Handle direct data format (fallback)
    if ("data" in rawResult) {
      return { data: rawResult.data as T };
    }

    // Unknown format
    console.error(
      `[API Client] Unknown response format:`,
      JSON.stringify(
        {
          method,
          path,
          fullResult: rawResult,
        },
        null,
        2,
      ),
    );
    return { error: "Unexpected response format" };
  } catch (error) {
    console.error(
      `[API Client] Request exception:`,
      JSON.stringify(
        {
          method,
          path,
          url: `${DASHBOARD_API_URL}${path}`,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  name: error.name,
                  stack: error.stack,
                }
              : error,
        },
        null,
        2,
      ),
    );
    return {
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * GET request helper
 */
export function get<T>(path: string, options?: Omit<RequestOptions, "body">) {
  return request<T>("GET", path, options);
}

/**
 * POST request helper
 */
export function post<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("POST", path, { ...options, body });
}

/**
 * PATCH request helper
 */
export function patch<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("PATCH", path, { ...options, body });
}

/**
 * PUT request helper
 */
export function put<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "body">,
) {
  return request<T>("PUT", path, { ...options, body });
}

/**
 * DELETE request helper
 */
export function del<T>(path: string, options?: RequestOptions) {
  return request<T>("DELETE", path, options);
}
