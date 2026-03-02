import { z } from "zod";
import {
  createOnrampOrderValidationSchema,
  createOnrampOrderApiSchema,
} from "./schemas";

/**
 * Interface for Coinbase API token request parameters
 * Used for making authenticated requests to Coinbase APIs
 */
export interface CoinbaseTokenRequest<T = unknown> {
  requestMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  requestHost: string;
  requestPath: string;
  requestBody?: T;
}

/**
 * TypeScript type inferred from the Zod schema
 * This ensures type safety while maintaining single source of truth
 */
export type CreateOnrampOrderParams = z.infer<
  typeof createOnrampOrderValidationSchema
>;

/**
 * TypeScript type for API parameters sent to Coinbase
 * Includes fields from API schema that are sent to Coinbase API
 */
export type CreateOnrampOrderApiParams = z.infer<
  typeof createOnrampOrderApiSchema
>;

export interface CoinbaseOrderResponse {
  order: CoinbaseOrder;
  paymentLink: CoinbasePaymentLink;
}

export interface CoinbasePaymentLink {
  url: string;
  paymentLinkType: string;
}

export interface CoinbaseOrder {
  createdAt: string;
  destinationAddress: string;
  destinationNetwork: string;
  exchangeRate: string;
  fees: {
    type: string;
    amount: string;
    currency: string;
  }[];
  orderId: string;
  paymentCurrency: string;
  paymentMethod: string;
  paymentSubtotal: string;
  paymentTotal: string;
  purchaseAmount: string;
  purchaseCurrency: string;
  status: string;
  updatedAt: string;
}

export interface OnrampOrderResponse {
  id: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
  orderDetails: CoinbaseOrder;
}
