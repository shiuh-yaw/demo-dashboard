/**
 * Fireblocks Orders API client (server-only)
 * Mirrors the cross-border-ap-ar / visa-direct pattern.
 */
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import { env } from "./env";
import { getFireblocksConfig } from "./fireblocks-network";

const FIREBLOCKS_BASE = "https://api.fireblocks.io";
const ORDERS_PATH = "/v1/trading/orders";

function decodePem(raw: string): string {
  if (raw.trimStart().startsWith("-----BEGIN")) return raw;
  return Buffer.from(raw, "base64").toString("utf-8");
}

function buildAuthJwt(
  apiKey: string,
  privateKey: string,
  path: string,
  body: unknown,
): string {
  const bodyStr = body != null ? JSON.stringify(body) : "";
  const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      uri: path,
      nonce: randomUUID(),
      iat: now,
      exp: now + 30,
      sub: apiKey,
      bodyHash,
    },
    privateKey,
    { algorithm: "RS256" },
  );
}

export interface PayoutOrderResult {
  orderId: string;
  status: string;
  mock: boolean;
}

/**
 * Single trading order returned by Fireblocks `GET /v1/trading/orders`.
 * Shape mirrors the public Fireblocks Orders API — only the fields we
 * use today are typed, but the object is accepted as a read-only record
 * for callers that need extra metadata.
 */
export interface FireblocksOrder {
  id: string;
  status: string;
  side?: string;
  baseAmount?: string;
  baseAssetId?: string;
  quoteAssetId?: string;
  quoteAmount?: string | null;
  createdAt: string;
  updatedAt?: string;
  customerInternalReferenceId?: string;
  note?: string;
  destination?: {
    type: string;
    /** Present when type === "ONE_TIME_ADDRESS" */
    address?: string;
    accountId?: string;
  };
  source?: {
    type: string;
    accountId?: string;
  };
}

/**
 * Lists Fireblocks trading orders (GET /v1/trading/orders). Returns up
 * to `pageSize` most-recent orders. Returns an empty array (rather than
 * throwing) when credentials are missing — callers can treat the absence
 * of credentials as "demo mode" without special-casing.
 */
export async function listOrders(pageSize = 50): Promise<FireblocksOrder[]> {
  const apiKey = env.FIREBLOCKS_API_KEY;
  const apiSecretRaw = env.FIREBLOCKS_API_SECRET;
  if (!apiKey || !apiSecretRaw) return [];

  const privateKey = decodePem(apiSecretRaw);
  const path = `${ORDERS_PATH}?pageSize=${pageSize}`;
  const token = buildAuthJwt(apiKey, privateKey, path, null);

  const res = await fetch(`${FIREBLOCKS_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Fireblocks] GET ${path} ${res.status}:`, text);
    throw new Error(`Fireblocks request failed (${res.status})`);
  }

  const json = (await res.json()) as { data?: FireblocksOrder[] };
  return json.data ?? [];
}

export async function createPayoutOrder(params: {
  amountUsdc: number;
  walletAddress: string;
  monthKey: string;
  chainId: number;
}): Promise<PayoutOrderResult> {
  const apiKey = env.FIREBLOCKS_API_KEY;
  const apiSecretRaw = env.FIREBLOCKS_API_SECRET;
  const networkCfg = getFireblocksConfig(params.chainId);

  // Fall through to mock when Fireblocks credentials are missing OR when the
  // selected chain has no Fireblocks provider account configured (e.g. demo
  // testnets like Polygon Amoy / Base Sepolia). The UI still shows the full
  // payout flow with a "Demo (simulated)" badge.
  if (!apiKey || !apiSecretRaw || !networkCfg) {
    const reason = !networkCfg
      ? `no Fireblocks config for chainId=${params.chainId}`
      : "Fireblocks credentials missing";
    const mockId = `mock-payout-${params.monthKey}-${Date.now()}`;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Fireblocks] Mock payout order (${reason}): ${mockId}`);
    }
    return { orderId: mockId, status: "SUBMITTED", mock: true };
  }

  const privateKey = decodePem(apiSecretRaw);

  const body = {
    via: {
      type: "PROVIDER_ACCOUNT",
      providerId: networkCfg.providerId,
      accountId: networkCfg.accountId,
    },
    executionRequestDetails: {
      type: "MARKET",
      side: "SELL",
      baseAmount: String(params.amountUsdc),
      baseAssetId: "USD",
      quoteAssetId: networkCfg.assetId,
    },
    settlement: {
      type: "PREFUNDED",
      destinationAccount: {
        type: "ONE_TIME_ADDRESS",
        address: params.walletAddress,
      },
    },
    customerInternalReferenceId: `proceeds-${params.monthKey}`,
    note: `Proceeds payout — ${params.monthKey}`,
  };

  const token = buildAuthJwt(apiKey, privateKey, ORDERS_PATH, body);

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log(
      `[Fireblocks] POST ${ORDERS_PATH}`,
      JSON.stringify(body, null, 2),
    );
  }

  const res = await fetch(`${FIREBLOCKS_BASE}${ORDERS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }

  if (isDev) {
    console.log(
      `[Fireblocks] Response ${res.status}`,
      JSON.stringify(data, null, 2),
    );
  }

  if (!res.ok) {
    // Log full error server-side; surface a generic message upstream so
    // callers don't echo Fireblocks internals back to the client.
    console.error(`[Fireblocks] ${res.status}`, data);
    throw new Error(`Fireblocks request failed (${res.status})`);
  }

  const result = data as { id: string; status: string };
  return { orderId: result.id, status: result.status, mock: false };
}

export async function getOrderStatus(
  orderId: string,
): Promise<{ orderId: string; status: string; mock: boolean }> {
  if (orderId.startsWith("mock-")) {
    return { orderId, status: "FILLED", mock: true };
  }

  const apiKey = env.FIREBLOCKS_API_KEY;
  const apiSecretRaw = env.FIREBLOCKS_API_SECRET;

  if (!apiKey || !apiSecretRaw) {
    return { orderId, status: "FILLED", mock: true };
  }

  const path = `${ORDERS_PATH}/${orderId}`;
  const privateKey = decodePem(apiSecretRaw);
  const token = buildAuthJwt(apiKey, privateKey, path, null);

  const res = await fetch(`${FIREBLOCKS_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Fireblocks] GET ${path} ${res.status}:`, text);
    throw new Error(`Fireblocks request failed (${res.status})`);
  }

  const result = (await res.json()) as { id: string; status: string };
  return { orderId: result.id, status: result.status, mock: false };
}
