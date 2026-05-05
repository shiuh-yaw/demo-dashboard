/**
 * Shared types for Coinbase Onramp orders.
 *
 * Extracted from apps/dashboard/src/lib/coinbase/types.ts.
 */

import type { z } from "zod";
import type {
  createOnrampOrderApiSchema,
  createOnrampOrderValidationSchema,
} from "./schemas";

/** Authenticated request descriptor for the internal HTTP helper. */
export interface CoinbaseTokenRequest<T = unknown> {
  requestMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  requestHost: string;
  requestPath: string;
  requestBody?: T;
}

/** Server-side validated parameters used to call Coinbase. */
export type CreateOnrampOrderParams = z.infer<
  typeof createOnrampOrderValidationSchema
>;

/** API surface that callers POST against the dashboard route. */
export type CreateOnrampOrderApiParams = z.infer<
  typeof createOnrampOrderApiSchema
>;

/** Shape returned by Coinbase's create-order endpoint. */
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

/** Normalized response surfaced to dashboard callers. */
export interface OnrampOrderResponse {
  id: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
  orderDetails: CoinbaseOrder;
}
