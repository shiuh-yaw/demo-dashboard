/**
 * Proceeds-specific Fireblocks Orders integration.
 *
 * The shared `/v1/trading/orders` client lives in
 * `@dynamic-demos/fireblocks` (Phase 1A). Everything in this file is
 * proceeds-specific glue: per-chain provider lookup, mock-mode
 * fallback for testnets without a Fireblocks provider account, and
 * the `createPayoutOrder` / `getOrderStatus` shapes the route handlers
 * already speak.
 */
import {
  createOrder,
  FireblocksOrdersError,
  getOrder,
  listOrders as packageListOrders,
  type FireblocksOrder,
  type FireblocksOrdersClient,
  type ProviderEnvironment,
} from "@dynamic-demos/fireblocks";
import { env } from "./env";
import { getFireblocksConfig } from "./fireblocks-network";

// Re-export the canonical type so existing call sites
// (`fireblocks-pending.ts`) keep working without churn.
export type { FireblocksOrder } from "@dynamic-demos/fireblocks";

export interface PayoutOrderResult {
  orderId: string;
  status: string;
  mock: boolean;
}

/**
 * Sandbox-by-default per D-005. Proceeds runs production payouts on
 * Polygon mainnet today; once a `FIREBLOCKS_ENVIRONMENT=production`
 * env var lands (Phase 1B/1E follow-up), prefer it over `NODE_ENV`.
 * Until then we keep the original behaviour by routing through
 * `api.fireblocks.io` regardless of the resolved env.
 */
function resolveEnvironment(): ProviderEnvironment {
  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

/**
 * Build a `FireblocksOrdersClient` from app env. Returns `null` when
 * credentials are missing — callers treat the absence as "demo mode"
 * and short-circuit to mock data.
 */
function getOrdersClient(): FireblocksOrdersClient | null {
  if (!env.FIREBLOCKS_API_KEY || !env.FIREBLOCKS_API_SECRET) return null;
  return {
    apiKey: env.FIREBLOCKS_API_KEY,
    apiSecretPem: env.FIREBLOCKS_API_SECRET,
    env: resolveEnvironment(),
    // Proceeds' previous client always pointed at `api.fireblocks.io`.
    // Override the package's sandbox default until we wire an explicit
    // `FIREBLOCKS_ENVIRONMENT` env var alongside the credentials.
    baseUrl: "https://api.fireblocks.io",
  };
}

/**
 * Lists Fireblocks trading orders for the proceeds wallet view. Returns
 * an empty array (rather than throwing) when credentials are missing —
 * callers can treat the absence as "demo mode" without special-casing.
 */
export async function listOrders(pageSize = 50): Promise<FireblocksOrder[]> {
  const client = getOrdersClient();
  if (!client) return [];

  return packageListOrders(client, { pageSize });
}

export async function createPayoutOrder(params: {
  amountUsdc: number;
  walletAddress: string;
  monthKey: string;
  chainId: number;
}): Promise<PayoutOrderResult> {
  const client = getOrdersClient();
  const networkCfg = getFireblocksConfig(params.chainId);

  // Fall through to mock when Fireblocks credentials are missing OR when the
  // selected chain has no Fireblocks provider account configured (e.g. demo
  // testnets like Polygon Amoy / Base Sepolia). The UI still shows the full
  // payout flow with a "Demo (simulated)" badge.
  if (!client || !networkCfg) {
    const reason = !networkCfg
      ? `no Fireblocks config for chainId=${params.chainId}`
      : "Fireblocks credentials missing";
    const mockId = `mock-payout-${params.monthKey}-${Date.now()}`;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Fireblocks] Mock payout order (${reason}): ${mockId}`);
    }
    return { orderId: mockId, status: "SUBMITTED", mock: true };
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(
      `[Fireblocks] POST /v1/trading/orders for ${params.amountUsdc} USDC → ${params.walletAddress} (chain ${params.chainId})`,
    );
  }

  try {
    const result = await createOrder(client, {
      side: "SELL",
      baseAmount: String(params.amountUsdc),
      baseAssetId: "USD",
      quoteAssetId: networkCfg.assetId,
      settlementType: "PREFUNDED",
      via: {
        providerId: networkCfg.providerId,
        accountId: networkCfg.accountId,
      },
      destinationAddress: params.walletAddress,
      customerInternalReferenceId: `proceeds-${params.monthKey}`,
      note: `Proceeds payout — ${params.monthKey}`,
    });

    return { orderId: result.orderId, status: result.status, mock: false };
  } catch (err) {
    if (err instanceof FireblocksOrdersError) {
      // Log full error server-side; surface a generic message upstream so
      // callers don't echo Fireblocks internals back to the client.
      console.error(`[Fireblocks] ${err.status}`, err.body);
      throw new Error(`Fireblocks request failed (${err.status})`);
    }
    throw err;
  }
}

export async function getOrderStatus(
  orderId: string,
): Promise<{ orderId: string; status: string; mock: boolean }> {
  if (orderId.startsWith("mock-")) {
    return { orderId, status: "FILLED", mock: true };
  }

  const client = getOrdersClient();
  if (!client) {
    return { orderId, status: "FILLED", mock: true };
  }

  try {
    const result = await getOrder(client, orderId);
    return { orderId: result.id, status: result.status, mock: false };
  } catch (err) {
    if (err instanceof FireblocksOrdersError) {
      console.error(
        `[Fireblocks] GET /v1/trading/orders/${orderId} ${err.status}:`,
        err.body,
      );
      throw new Error(`Fireblocks request failed (${err.status})`);
    }
    throw err;
  }
}
