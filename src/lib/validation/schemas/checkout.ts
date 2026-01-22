/**
 * Checkout Zod Schemas
 *
 * Validation schemas for checkout-related operations.
 */

import { z } from "zod";
import { nonEmptyString, coercedPageNumber, coercedPageSize } from "./common";

// =============================================================================
// Enums
// =============================================================================

/**
 * Checkout mode enum
 */
export const checkoutModeSchema = z.enum(["deposit", "payment"]);

export type CheckoutModeEnum = z.infer<typeof checkoutModeSchema>;

// =============================================================================
// Get Stats
// =============================================================================

/**
 * Schema for getting checkout stats
 */
export const getStatsSchema = z.object({
  checkoutId: nonEmptyString.describe("Checkout ID"),
});

export type GetStatsInput = z.infer<typeof getStatsSchema>;

// =============================================================================
// List Users
// =============================================================================

/**
 * Schema for listing users
 */
export const listUsersSchema = z.object({
  checkoutId: nonEmptyString.describe("Checkout ID"),
  page: coercedPageNumber.describe("Page number (1-indexed)"),
  pageSize: coercedPageSize.describe("Number of items per page"),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;

// =============================================================================
// Checkout Params (Common)
// =============================================================================

/**
 * Schema for checkout path params
 */
export const checkoutParamsSchema = z.object({
  checkoutId: nonEmptyString.describe("Checkout ID"),
});

export type CheckoutParams = z.infer<typeof checkoutParamsSchema>;

/**
 * Schema for checkout ID only (alias for simpler handlers)
 */
export const checkoutIdSchema = checkoutParamsSchema;

export type CheckoutIdInput = CheckoutParams;
