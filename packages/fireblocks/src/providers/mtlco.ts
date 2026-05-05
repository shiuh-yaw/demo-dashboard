/**
 * MTLco — Fireblocks Network listing wrapper.
 *
 * MTLco is consumed exclusively through Fireblocks DVP / Network trading;
 * it does not expose a separate REST API. This module is therefore a thin
 * wrapper around `createOrder` from `../orders` — it does NOT call MTLco
 * directly. The "package boundary by mechanism" rule (D-009) keeps this
 * here rather than in a dedicated `packages/mtlco`.
 *
 * Env vars (apps own these):
 *   - `FIREBLOCKS_MTLCO_PROVIDER_ID`
 *       testnet: `FIREBLOCKS_TESTNET`
 *       mainnet: `FIREBLOCKS`
 *   - `FIREBLOCKS_MTLCO_ACCOUNT_ID`
 *       UUID of the MTLco network account in the Fireblocks workspace.
 *
 * Sandbox-by-default (D-005): the wrapper takes an explicit `env` field;
 * callers default at the call-site, never inside the wrapper.
 *
 * @see https://developers.fireblocks.com/reference/createorder
 */

import {
  createOrder,
  type CreateOrderResult,
  type FireblocksOrdersClient,
  type ProviderEnvironment,
} from "../orders";

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * MTLco provider routing config. Sourced from env vars in the consuming
 * app — kept opaque here so the provider-id naming convention can evolve
 * without churning every caller.
 */
export interface MtlcoConfig {
  providerId: string;
  accountId: string;
}

export interface CreateMtlcoOnrampOrderParams {
  /** USD amount to convert to USDC. */
  amountUsd: number;
  /** EVM address that will receive the resulting USDC. */
  destinationAddress: string;
  /** Fireblocks asset id of the USDC variant to receive. */
  quoteAssetId: string;
  /** MTLco provider account in this Fireblocks workspace. */
  config: MtlcoConfig;
  /** Provider environment (D-005). Default at the call site, not here. */
  env: ProviderEnvironment;
  /** Optional caller-defined reference (e.g. `proceeds-2025-01`). */
  customerInternalReferenceId?: string;
  note?: string;
}

// ─── Order creation ──────────────────────────────────────────────────────────

/**
 * Create an MTLco PREFUNDED on-ramp order: USD → USDC, with funds
 * delivered to a one-time EVM address.
 *
 * The `client` argument carries Fireblocks credentials; the `params.env`
 * argument is reserved for future per-call routing decisions (e.g. when
 * MTLco exposes an explicit sandbox account id distinct from production).
 *
 * @example
 * ```ts
 * const result = await createMtlcoOnrampOrder(
 *   { apiKey, apiSecretPem, env: 'sandbox' },
 *   {
 *     amountUsd: 1000,
 *     destinationAddress: '0x…',
 *     quoteAssetId: 'USDC_POLYGON_NXTB',
 *     config: { providerId: 'FIREBLOCKS_TESTNET', accountId: '…' },
 *     env: 'sandbox',
 *   },
 * );
 * ```
 */
export async function createMtlcoOnrampOrder(
  client: FireblocksOrdersClient,
  params: CreateMtlcoOnrampOrderParams,
): Promise<CreateOrderResult> {
  return createOrder(client, {
    side: "SELL",
    baseAmount: String(params.amountUsd),
    baseAssetId: "USD",
    quoteAssetId: params.quoteAssetId,
    settlementType: "PREFUNDED",
    via: {
      providerId: params.config.providerId,
      accountId: params.config.accountId,
    },
    destinationAddress: params.destinationAddress,
    customerInternalReferenceId: params.customerInternalReferenceId,
    note: params.note,
  });
}

// ─── Status mapping ──────────────────────────────────────────────────────────

/**
 * TODO(phase-1e): replace with the real `TransactionState` enum from
 * `packages/transactions` once Phase 1E lands. The mapping below is the
 * placeholder Fireblocks-order status taxonomy — keep it in sync with the
 * canonical enum when 1E merges.
 *
 * Until then, this is a string union so consumers can still write tests
 * against expected outputs without coupling to an unfinished package.
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
 * Translate a Fireblocks-order status into our canonical lifecycle state.
 *
 * TODO(phase-1e): swap the return type for the canonical
 * `TransactionState` from `@dynamic-demos/transactions` once 1E lands.
 * Until then, unknown statuses fall through to `pending` so the UI
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
