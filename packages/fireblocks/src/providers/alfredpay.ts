/**
 * alfredPay — Fireblocks Network listing wrapper (DVP off-ramp path).
 *
 * This is the **Fireblocks-mediated path**: USDC → fiat via alfredPay's
 * Fireblocks Network listing using DVP settlement. The **direct alfredPay
 * REST integration** lives in `packages/alfredpay` (Phase 1B) and is the
 * better fit when a demo wants to call alfredPay directly via Dynamic
 * wallets without Fireblocks vault custody.
 *
 * Demos pick one based on custody and signing model:
 *   - Fireblocks vault custody → use this wrapper.
 *   - Self-custody / Dynamic wallets → use `packages/alfredpay` direct REST.
 *
 * Env vars (apps own these):
 *   - `FIREBLOCKS_ALFRED_PROVIDER_ID`
 *       testnet: `ALFREDPAY_TEST`
 *       mainnet: `ALFREDPAY`
 *   - `FIREBLOCKS_ALFRED_ACCOUNT_ID`
 *       UUID of the alfredPay network account in the Fireblocks workspace.
 *
 * Sandbox-by-default (D-005): callers pass an explicit `env`. The
 * wrapper does not sniff `process.env.NODE_ENV`.
 *
 * @see https://developers.fireblocks.com/reference/createorder
 */

import {
  createOrder,
  type CreateOrderResult,
  type FireblocksOrdersClient,
  type OrderBeneficiary,
  type ProviderEnvironment,
} from "../orders";

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * alfredPay provider routing config when consumed via Fireblocks. The
 * direct-REST equivalent (Phase 1B `packages/alfredpay`) carries an API
 * key + base URL instead — distinct config for distinct mechanisms.
 */
export interface AlfredpayFireblocksConfig {
  providerId: string;
  accountId: string;
}

export interface CreateAlfredpayOfframpOrderParams {
  /** USDC amount to send. */
  amountUsdc: number;
  /** Fireblocks asset id of the USDC variant to spend (e.g. testnet USDC). */
  baseAssetId: string;
  /** Fiat ISO code to receive (e.g. `MXN`, `BRL`). */
  quoteAssetId: string;
  /** Bank-account beneficiary on the fiat leg. */
  beneficiary: OrderBeneficiary;
  /** alfredPay provider account in this Fireblocks workspace. */
  config: AlfredpayFireblocksConfig;
  /** Provider environment (D-005). Default at the call site, not here. */
  env: ProviderEnvironment;
  /** Optional caller-defined reference. */
  customerInternalReferenceId?: string;
  note?: string;
}

// ─── Order creation ──────────────────────────────────────────────────────────

/**
 * Create an alfredPay DVP off-ramp order: USDC → fiat, with bank-account
 * delivery via a counterparty-escrowed DVP settlement.
 *
 * @example
 * ```ts
 * const result = await createAlfredpayOfframpOrder(
 *   { apiKey, apiSecretPem, env: 'sandbox' },
 *   {
 *     amountUsdc: 100,
 *     baseAssetId: 'USDC_ETH_TEST5_0GER',
 *     quoteAssetId: 'MXN',
 *     beneficiary: { accountName, bank, clabe, accountNumber },
 *     config: { providerId: 'ALFREDPAY_TEST', accountId: '…' },
 *     env: 'sandbox',
 *   },
 * );
 * ```
 */
export async function createAlfredpayOfframpOrder(
  client: FireblocksOrdersClient,
  params: CreateAlfredpayOfframpOrderParams,
): Promise<CreateOrderResult> {
  return createOrder(client, {
    side: "SELL",
    baseAmount: String(params.amountUsdc),
    baseAssetId: params.baseAssetId,
    quoteAssetId: params.quoteAssetId,
    settlementType: "DVP",
    via: {
      providerId: params.config.providerId,
      accountId: params.config.accountId,
    },
    beneficiary: params.beneficiary,
    customerInternalReferenceId: params.customerInternalReferenceId,
    note: params.note,
  });
}

// ─── Status mapping ──────────────────────────────────────────────────────────

/**
 * TODO(phase-1e): replace with the real `TransactionState` enum from
 * `packages/transactions` once Phase 1E lands. Mirrors the placeholder
 * in `./mtlco.ts` — kept duplicated for now so each provider can diverge
 * once we know the exact upstream taxonomy.
 */
export type PlaceholderTransactionState =
  | "initialized"
  | "draft"
  | "submitted"
  | "pending"
  | "confirmed"
  | "expired"
  | "abandoned"
  | "failed"
  | "cancelled";

/**
 * Translate alfredPay-via-Fireblocks order status into our canonical
 * lifecycle state.
 *
 * TODO(phase-1e): swap the return type for the canonical
 * `TransactionState` enum from `@dynamic-demos/transactions` once 1E
 * lands. Unknown statuses currently fall through to `pending` so the UI
 * keeps polling rather than declaring premature failure.
 */
export function mapStatus(upstream: string): PlaceholderTransactionState {
  switch (upstream.toUpperCase()) {
    case "CREATED":
    case "SUBMITTED":
      return "submitted";
    case "PROCESSING":
    case "AWAITING_PAYMENT":
    case "PENDING_USER_ACTION":
      return "pending";
    case "FILLED":
    case "EXECUTED":
    case "COMPLETED":
      return "confirmed";
    case "FAILED":
    case "REJECTED":
      return "failed";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    default:
      return "pending";
  }
}
