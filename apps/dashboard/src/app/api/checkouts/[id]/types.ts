/**
 * Shared Types for Checkout Routes
 *
 * Common type definitions for route parameters used across checkout API endpoints.
 */

/**
 * Route params for checkout-scoped endpoints
 * Used by: GET /api/checkouts/[id], GET /api/checkouts/[id]/stats, GET /api/checkouts/[id]/users, etc.
 */
export type CheckoutParams = Promise<{ id: string }>;

/**
 * Route params for transaction-scoped endpoints
 * Used by: GET/PATCH /api/checkouts/[id]/transactions/[txId] and all sub-routes
 */
export type TransactionParams = Promise<{ id: string; txId: string }>;
