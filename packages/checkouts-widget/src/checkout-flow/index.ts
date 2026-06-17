"use client";

/**
 * Dynamic Flow — thin SSR-safe wrappers.
 *
 * Mirrors the pattern in host `flow-sdk.ts` files: each wrapper forwards
 * to the underlying Dynamic SDK function and re-exports parameter /
 * response types. Centralises the SDK surface this package uses so test
 * mocks and future SDK changes have a single touchpoint.
 *
 * IMPORTANT: All Flow API calls go through this module. The rest of the
 * app should import from `@dynamic-demos/checkouts-widget/checkout-flow`,
 * not directly from `@dynamic-labs-sdk/client`.
 *
 * Step 1 (flow creation with amount) still uses the deprecated
 * `createCheckoutTransaction` bridge when the host passes a reusable
 * Checkout config id + per-session amount. Attach → quote → submit →
 * poll use the canonical Flow SDK functions (`flowId` === transaction id).
 */

import {
  createCheckoutTransaction as sdkCreate,
  attachFlowSource as sdkAttachFlow,
  getFlowQuote as sdkGetFlowQuote,
  submitFlowTransaction as sdkSubmitFlow,
  getFlow as sdkGetFlow,
  cancelFlow as sdkCancelFlow,
  type Flow,
  type CheckoutTransactionCreateResponse,
  type CreateCheckoutTransactionParams,
} from "@dynamic-labs-sdk/client";
import type { Chain } from "@dynamic-labs-sdk/client";

/** Canonical Flow record; kept as CheckoutTransaction for host compatibility. */
export type CheckoutTransaction = Flow;

export type {
  CheckoutTransactionCreateResponse,
  CreateCheckoutTransactionParams,
};

export type WalletSourceParams = {
  /** Flow id (legacy name: transactionId). */
  transactionId: string;
  fromAddress: string;
  fromChainId: string;
  fromChainName: Chain;
};

export type GetQuoteParams = {
  transactionId: string;
  fromTokenAddress: string;
  /** Chain the source token lives on — required by the Flow quote API. */
  fromChainId?: string;
  slippage?: number;
};

export type SubmitParams = {
  transactionId: string;
  walletAccount: Parameters<typeof sdkSubmitFlow>[0]["walletAccount"];
  onStepChange?: (step: "approval" | "transaction") => void;
};

export const createTransaction = (
  params: CreateCheckoutTransactionParams,
): Promise<CheckoutTransactionCreateResponse> => sdkCreate(params);

export const attachWalletSource = async (
  params: WalletSourceParams,
): Promise<CheckoutTransaction> => {
  const { flow } = await sdkAttachFlow({
    flowId: params.transactionId,
    fromAddress: params.fromAddress,
    fromChainId: params.fromChainId,
    fromChainName: params.fromChainName,
    sourceType: "wallet",
  });
  return flow;
};

export const getQuote = (params: GetQuoteParams): Promise<CheckoutTransaction> =>
  sdkGetFlowQuote({
    flowId: params.transactionId,
    fromTokenAddress: params.fromTokenAddress,
    fromChainId: params.fromChainId,
    slippage: params.slippage,
  });

export const submit = (params: SubmitParams): Promise<CheckoutTransaction> =>
  sdkSubmitFlow({
    flowId: params.transactionId,
    walletAccount: params.walletAccount,
    onStepChange: params.onStepChange,
  });

export const getTransaction = (params: {
  transactionId: string;
}): Promise<CheckoutTransaction> =>
  sdkGetFlow({ flowId: params.transactionId });

export const cancel = (params: {
  transactionId: string;
}): Promise<CheckoutTransaction> =>
  sdkCancelFlow({ flowId: params.transactionId });
