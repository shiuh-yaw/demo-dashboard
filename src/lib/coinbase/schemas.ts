import { z } from "zod";

/**
 * Base schema for onramp order creation
 * Contains common fields shared between validation and API schemas
 */
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
 * Full validation schema for onramp order creation requests
 * Includes all fields required for business logic and compliance validation
 * Extends base schema with server-side validation fields
 */
export const createOnrampOrderValidationSchema =
  createOnrampOrderBaseSchema.extend({
    // Fields needed for validation/compliance but from the app
    email: z.string().email("Invalid email format"),
    partnerUserRef: z.string().min(1, "partnerUserRef is required"),
    phoneNumber: z.string().min(1, "phoneNumber is required"),
    phoneNumberVerifiedAt: z
      .string()
      .min(1, "phoneNumberVerifiedAt is required"),
  });

/**
 * API schema for Coinbase onramp order creation
 * Only includes fields that are actually sent to the Coinbase API
 * Extends base schema with API-specific fields
 */
export const createOnrampOrderApiSchema = createOnrampOrderBaseSchema.extend({
  isSandbox: z.boolean(),
});
