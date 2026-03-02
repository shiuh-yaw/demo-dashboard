/**
 * URL Parameter Parsing Utilities
 *
 * Server-side utilities for parsing URL query parameters.
 * Used to capture transaction params securely on the server.
 */

/**
 * Transaction parameters extracted from URL
 */
export interface TransactionUrlParams {
  /** External ID for linking to external systems */
  externalId?: string;
  /** Additional metadata as JSON object */
  metadata?: Record<string, unknown>;
}

/**
 * Parse transaction parameters from URL query string
 *
 * Done server-side to prevent client manipulation.
 * Supports:
 * - externalId: string parameter
 * - metadata: URL-encoded JSON object
 *
 * @example
 * // URL: /w/abc123?externalId=order-456&metadata=%7B%22customerId%22%3A%22789%22%7D
 * parseTransactionParams(searchParams)
 * // Returns: { externalId: "order-456", metadata: { customerId: "789" } }
 */
export function parseTransactionParams(query: {
  [key: string]: string | string[] | undefined;
}): TransactionUrlParams {
  const result: TransactionUrlParams = {};

  // Extract externalId
  const externalId =
    typeof query.externalId === "string" ? query.externalId : undefined;
  if (externalId) result.externalId = externalId;

  // Extract and parse metadata JSON
  const metadataStr =
    typeof query.metadata === "string" ? query.metadata : undefined;
  if (metadataStr) {
    try {
      const parsed = JSON.parse(metadataStr);
      if (typeof parsed === "object" && parsed !== null) {
        result.metadata = parsed;
      }
    } catch {
      console.warn("Failed to parse metadata from URL:", metadataStr);
    }
  }

  return result;
}
