/**
 * Zod schemas for Coinbase Onramp order creation.
 *
 * Two schema flavors:
 *   - `createOnrampOrderApiSchema` — fields that are sent on the request
 *     body to Coinbase. This is what API routes validate against.
 *   - `createOnrampOrderValidationSchema` — superset including app-side
 *     compliance fields (email, phone, partnerUserRef) that the server
 *     attaches before calling Coinbase.
 *
 * Extracted from apps/dashboard/src/lib/coinbase/schemas.ts.
 */

import { z } from "zod";

const createOnrampOrderBaseSchema = z.object({
  agreementAcceptedAt: z.string().min(1, "agreementAcceptedAt is required"),
  destinationAddress: z.string().min(1, "destinationAddress is required"),
  destinationNetwork: z.string().min(1, "destinationNetwork is required"),
  paymentCurrency: z.string().min(1, "paymentCurrency is required"),
  purchaseCurrency: z.string().min(1, "purchaseCurrency is required"),
  isQuote: z.boolean(),
  paymentAmount: z.string().min(1, "paymentAmount is required"),
  purchaseAmount: z.string().min(1, "purchaseAmount is required"),
});

/**
 * Full validation schema for onramp order creation (compliance fields
 * supplied by the calling server, not by the end-user request body).
 */
export const createOnrampOrderValidationSchema =
  createOnrampOrderBaseSchema.extend({
    email: z.string().email("Invalid email format"),
    partnerUserRef: z.string().min(1, "partnerUserRef is required"),
    phoneNumber: z.string().min(1, "phoneNumber is required"),
    phoneNumberVerifiedAt: z
      .string()
      .min(1, "phoneNumberVerifiedAt is required"),
  });

/**
 * Schema for the request body that arrives at the dashboard route. The
 * `isSandbox` field allows callers to override the default environment
 * for a single request (e.g. dev tooling exercising a sandbox flow even
 * when the package is configured for production).
 */
export const createOnrampOrderApiSchema = createOnrampOrderBaseSchema.extend({
  isSandbox: z.boolean(),
});
