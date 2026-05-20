"use client";

/**
 * Dynamic Checkout Flow — thin SSR-safe wrappers.
 *
 * Mirrors the pattern in `lib/dynamicClient.ts`: each wrapper forwards to the
 * underlying Dynamic SDK function and re-exports the parameter / response
 * types. Centralises the SDK surface this app uses so test mocks and future
 * SDK changes have a single touchpoint.
 *
 * IMPORTANT: All Checkout Flow API calls go through this module. The rest of
 * the app should import from "@/lib/checkout-flow", not directly from
 * "@dynamic-labs-sdk/client".
 */

import {
  createCheckoutTransaction as sdkCreate,
  attachCheckoutTransactionSource as sdkAttach,
  getCheckoutTransactionQuote as sdkGetQuote,
  submitCheckoutTransaction as sdkSubmit,
  getCheckoutTransaction as sdkGet,
  cancelCheckoutTransaction as sdkCancel,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
  type CreateCheckoutTransactionParams,
  type GetCheckoutTransactionQuoteParams,
  type SubmitCheckoutTransactionParams,
  type CancelCheckoutTransactionParams,
  type GetCheckoutTransactionParams,
  type AttachCheckoutTransactionSourceParams,
} from "@dynamic-labs-sdk/client";
import type { Chain } from "@dynamic-labs-sdk/client";

export type {
  CheckoutTransaction,
  CheckoutTransactionCreateResponse,
  CreateCheckoutTransactionParams,
};

export type WalletSourceParams = {
  transactionId: string;
  fromAddress: string;
  fromChainId: string;
  fromChainName: Chain;
};

export const createTransaction = (
  params: CreateCheckoutTransactionParams,
): Promise<CheckoutTransactionCreateResponse> => sdkCreate(params);

export const attachWalletSource = (
  params: WalletSourceParams,
): Promise<CheckoutTransaction> =>
  sdkAttach({ sourceType: "wallet", ...params } as AttachCheckoutTransactionSourceParams);

export const getQuote = (
  params: GetCheckoutTransactionQuoteParams,
): Promise<CheckoutTransaction> => sdkGetQuote(params);

export const submit = (
  params: SubmitCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkSubmit(params);

export const getTransaction = (
  params: GetCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkGet(params);

export const cancel = (
  params: CancelCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkCancel(params);
