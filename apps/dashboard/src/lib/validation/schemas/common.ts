/**
 * Common Zod Schemas
 *
 * Reusable base schemas for common data types.
 * These serve as building blocks for domain-specific schemas.
 */

import { z } from "zod";

// =============================================================================
// Primitive Validators
// =============================================================================

/**
 * Non-empty string validator
 */
export const nonEmptyString = z.string().min(1, "This field is required");

/**
 * Ethereum address validator (0x + 40 hex chars)
 */
export const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

/**
 * Multi-chain wallet address validator
 * Supports: EVM (0x...), Solana (base58), Bitcoin (1.., 3.., bc1..), etc.
 * Uses permissive validation - just ensures reasonable format
 */
export const walletAddress = z
  .string()
  .min(26, "Wallet address is too short")
  .max(128, "Wallet address is too long")
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Wallet address must contain only alphanumeric characters"
  );

/**
 * Transaction hash validator (0x + 64 hex chars)
 */
export const transactionHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash");

/**
 * Chain ID validator (positive integer)
 */
export const chainId = z
  .number()
  .int("Chain ID must be an integer")
  .positive("Chain ID must be positive");

/**
 * Token amount as string (for precision)
 */
export const tokenAmount = z
  .string()
  .regex(/^\d+$/, "Amount must be a numeric string");

/**
 * CUID2 identifier validator
 */
export const cuid2 = z
  .string()
  .min(21, "Invalid ID format")
  .max(24, "Invalid ID format");

/**
 * ISO timestamp string
 */
export const isoTimestamp = z
  .string()
  .datetime({ message: "Invalid timestamp format" });

// =============================================================================
// Pagination
// =============================================================================

/**
 * Page number (1-indexed)
 */
export const pageNumber = z
  .number()
  .int()
  .min(1, "Page must be at least 1")
  .default(1);

/**
 * Page size with reasonable limits
 */
export const pageSize = z
  .number()
  .int()
  .min(1, "Page size must be at least 1")
  .max(100, "Page size cannot exceed 100")
  .default(20);

/**
 * Pagination params schema
 */
export const paginationSchema = z.object({
  page: pageNumber,
  pageSize: pageSize,
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// =============================================================================
// Metadata
// =============================================================================

/**
 * Generic metadata object
 * Limited depth for safety
 */
export const metadata = z.record(z.unknown()).optional();

/**
 * External ID for linking to external systems
 */
export const externalId = z
  .string()
  .min(1, "External ID cannot be empty")
  .max(255, "External ID is too long")
  .optional();

// =============================================================================
// Coercion Helpers
// =============================================================================

/**
 * Coerce string to number (useful for query params)
 */
export const coercedNumber = z.coerce.number();

/**
 * Coerce string to integer
 */
export const coercedInt = z.coerce.number().int();

/**
 * Coerce string to positive integer
 */
export const coercedPositiveInt = z.coerce.number().int().positive();

/**
 * Optional coerced page number
 */
export const coercedPageNumber = z.coerce
  .number()
  .int()
  .min(1)
  .optional()
  .default(1);

/**
 * Optional coerced page size
 */
export const coercedPageSize = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .default(20);

// =============================================================================
// Token Schema
// =============================================================================

/**
 * Token schema matching LI.FI token structure
 */
export const tokenSchema = z.object({
  address: nonEmptyString.describe("Token contract address"),
  chainId: chainId.describe("Chain ID where token exists"),
  symbol: nonEmptyString.describe("Token symbol"),
  decimals: z.number().int().min(0).max(18).describe("Token decimals"),
  name: nonEmptyString.describe("Token name"),
  logoURI: z.string().url().optional().describe("Token logo URI"),
  priceUSD: z.string().optional().describe("Token price in USD"),
  coinKey: z.string().optional().describe("Token coin key identifier"),
  tags: z.array(z.string()).optional().describe("Token tags"),
});
