/**
 * Server-side Dashboard API Client
 *
 * Shared HTTP client for dashboard API requests from server-side code.
 * Handles error handling and response parsing without client-side dependencies.
 */

import { env } from "@/lib/env";

const DASHBOARD_API_URL = env.NEXT_PUBLIC_DASHBOARD_API_URL;

/**
 * HTTP methods supported by the client
 */
type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Request options for the server-side API client
 */
interface ServerRequestOptions {
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Cache mode (Next.js specific) */
  cache?: RequestCache | { next: { revalidate: number } };
}

/**
 * Make a request to the dashboard API (server-side)
 *
 * @param method - HTTP method
 * @param path - API path (e.g., "/api/checkouts/123")
 * @param options - Request options
 * @returns API result with data or error
 */
export async function serverRequest<T>(
  method: HttpMethod,
  path: string,
  options: ServerRequestOptions = {},
): Promise<{ data?: T; error?: string }> {
  const { body, headers = {}, cache } = options;

  try {
    const url = `${DASHBOARD_API_URL}${path}`;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body !== undefined) fetchOptions.body = JSON.stringify(body);

    // Handle Next.js cache options
    if (cache) {
      if (typeof cache === "object" && "next" in cache) {
        (fetchOptions as any).next = cache.next;
      } else {
        fetchOptions.cache = cache;
      }
    }

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

      return { error: errorMessage };
    }

    const rawResult = await response.json();

    // Handle wrapped format: { success: true, data: T }
    if ("success" in rawResult) {
      if (!rawResult.success) {
        return { error: rawResult.error || "Request failed" };
      }
      if (rawResult.data === undefined) {
        return { error: "No data returned" };
      }
      return { data: rawResult.data };
    }

    // Handle direct transaction format: { transaction: T, created: boolean }
    if ("transaction" in rawResult) {
      return { data: rawResult.transaction as T };
    }

    // Handle direct data format (fallback)
    if ("data" in rawResult) {
      return { data: rawResult.data as T };
    }

    // Unknown format - return raw result
    return { data: rawResult as T };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/**
 * GET request helper (server-side)
 */
export function serverGet<T>(
  path: string,
  options?: Omit<ServerRequestOptions, "body">,
) {
  return serverRequest<T>("GET", path, options);
}

/**
 * POST request helper (server-side)
 */
export function serverPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<ServerRequestOptions, "body">,
) {
  return serverRequest<T>("POST", path, { ...options, body });
}
