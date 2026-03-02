/**
 * Validation Module
 *
 * Centralized validation using Zod with best practices.
 * Provides type-safe parsing and error handling.
 */

import { z, ZodError, type ZodSchema } from "zod";
import { ValidationError } from "@/lib/errors";

// =============================================================================
// Schema Imports (explicit for bundler module resolution)
// =============================================================================

// Common schemas
import {
  nonEmptyString,
  ethereumAddress,
  walletAddress,
  transactionHash,
  chainId,
  tokenAmount,
  cuid2,
  isoTimestamp,
  pageNumber,
  pageSize,
  paginationSchema,
  metadata,
  externalId,
  coercedNumber,
  coercedInt,
  coercedPositiveInt,
  coercedPageNumber,
  coercedPageSize,
  type PaginationParams,
} from "./schemas/common";

// Transaction schemas
import {
  transactionStatusSchema,
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionQuoteSchema,
  updateTransactionStatusSchema,
  getTransactionSchema,
  listTransactionsSchema,
  submitTransactionSchema,
  transactionStatusResponseSchema,
  type TransactionStatusEnum,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type GetTransactionQuoteInput,
  type UpdateTransactionStatusInput,
  type GetTransactionInput,
  type ListTransactionsInput,
  type SubmitTransactionInput,
  type TransactionStatusResponse,
} from "./schemas/transaction";

// Checkout schemas
import {
  checkoutModeSchema,
  getStatsSchema,
  listUsersSchema,
  checkoutParamsSchema,
  checkoutIdSchema,
  type CheckoutModeEnum,
  type GetStatsInput,
  type ListUsersInput,
  type CheckoutParams,
  type CheckoutIdInput,
} from "./schemas/checkout";

// =============================================================================
// Re-exports
// =============================================================================

// Common
export {
  nonEmptyString,
  ethereumAddress,
  walletAddress,
  transactionHash,
  chainId,
  tokenAmount,
  cuid2,
  isoTimestamp,
  pageNumber,
  pageSize,
  paginationSchema,
  metadata,
  externalId,
  coercedNumber,
  coercedInt,
  coercedPositiveInt,
  coercedPageNumber,
  coercedPageSize,
  type PaginationParams,
};

// Transaction
export {
  transactionStatusSchema,
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionQuoteSchema,
  updateTransactionStatusSchema,
  getTransactionSchema,
  listTransactionsSchema,
  submitTransactionSchema,
  transactionStatusResponseSchema,
  type TransactionStatusEnum,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type GetTransactionQuoteInput,
  type UpdateTransactionStatusInput,
  type GetTransactionInput,
  type ListTransactionsInput,
  type SubmitTransactionInput,
  type TransactionStatusResponse,
};

// Checkout
export {
  checkoutModeSchema,
  getStatsSchema,
  listUsersSchema,
  checkoutParamsSchema,
  checkoutIdSchema,
  type CheckoutModeEnum,
  type GetStatsInput,
  type ListUsersInput,
  type CheckoutParams,
  type CheckoutIdInput,
};

// Zod
export { z, ZodError };
export type { ZodSchema };

// =============================================================================
// Parsing Utilities
// =============================================================================

/**
 * Parse data with a Zod schema, throwing ValidationError on failure.
 * This integrates with our global error handling.
 *
 * @example
 * const input = parseWithSchema(createTransactionSchema, rawData);
 */
export function parseWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(formatZodError(result.error));
  }

  return result.data;
}

/**
 * Safe parse that returns result object instead of throwing.
 * Useful when you need to handle validation errors differently.
 *
 * @example
 * const result = safeParse(createTransactionSchema, rawData);
 * if (!result.success) {
 *   // Handle validation errors
 * }
 */
export function safeParse<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: new ValidationError(formatZodError(result.error)),
  };
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format a ZodError into a human-readable message.
 * Groups errors by field for clarity.
 *
 * @example
 * // "checkoutId: Required, fromAmount: Expected number"
 */
export function formatZodError(error: ZodError): string {
  const errors = error.errors.map((e) => {
    const path = e.path.length > 0 ? e.path.join(".") : "value";
    return `${path}: ${e.message}`;
  });

  return errors.join(", ");
}

/**
 * Get structured validation errors for API responses.
 * Returns field-level errors for rich client feedback.
 *
 * @example
 * // { checkoutId: ["Required"], fromAmount: ["Must be positive"] }
 */
export function getFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const e of error.errors) {
    const path = e.path.length > 0 ? e.path.join(".") : "_root";
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(e.message);
  }

  return fieldErrors;
}

// =============================================================================
// Request Parsing Helpers
// =============================================================================

/**
 * Parse URL search params into an object with coercion.
 * Handles arrays (repeated params) and type conversion.
 */
export function parseSearchParams(
  searchParams: URLSearchParams
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    const existing = result[key];

    // Handle repeated params as arrays
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(coerceValue(value));
      } else {
        result[key] = [existing, coerceValue(value)];
      }
    } else {
      result[key] = coerceValue(value);
    }
  });

  return result;
}

/**
 * Coerce string values to appropriate types.
 */
function coerceValue(value: string): unknown {
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number (only if it looks like a number)
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (!isNaN(num)) return num;
  }

  return value;
}

/**
 * Parse JSON body with schema validation.
 * Handles parse errors gracefully.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  return parseWithSchema(schema, body);
}

/**
 * Parse query params with schema validation.
 */
export function parseQueryParams<T>(request: Request, schema: ZodSchema<T>): T {
  const url = new URL(request.url);
  const params = parseSearchParams(url.searchParams);
  return parseWithSchema(schema, params);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if an error is a ZodError.
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

// =============================================================================
// Legacy Compatibility (from old validation.ts)
// =============================================================================

import { NextResponse } from "next/server";

/**
 * @deprecated Use parseWithSchema instead
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodIssue[]; message: string };

/**
 * @deprecated Use parseWithSchema instead
 */
export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.issues,
        message: "Validation failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [],
      message:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}

/**
 * @deprecated Use parseJsonBody with proper error handling instead
 */
export function validateRequestBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): T | NextResponse {
  const result = validateData(schema, body);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
        errors: result.errors,
      },
      { status: 400 }
    );
  }

  return result.data;
}

/**
 * @deprecated Use formatZodError instead
 */
export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map((error) => {
    const fieldPath = error.path.join(".");
    return `${fieldPath}: ${error.message}`;
  });
}

/**
 * @deprecated Use createErrorResponse from @/lib/api-response instead
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  error?: string,
  errors?: unknown
): NextResponse {
  interface ErrorResponse {
    success: false;
    message: string;
    error?: string;
    errors?: unknown;
  }

  const response: ErrorResponse = { success: false, message };
  if (error) response.error = error;
  if (errors) response.errors = errors;
  return NextResponse.json(response, { status: statusCode });
}
