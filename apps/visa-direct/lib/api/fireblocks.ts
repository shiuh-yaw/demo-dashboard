/**
 * Fireblocks REST API Client (server-only)
 *
 * Authentication: RS256 JWT signed with the API secret.
 * Each request gets a short-lived (30s) signed token.
 *
 * FIREBLOCKS_API_SECRET must be the RSA private key in PEM format,
 * base64-encoded. If the env value already starts with "-----BEGIN",
 * it is used directly (no base64 decode).
 */
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import { env } from "@/lib/env";

const FIREBLOCKS_BASE = "https://api.fireblocks.io";

export interface FireblocksTransactionResponse {
  id: string;
  status: string;
  subStatus?: string;
  txHash?: string;
  assetId?: string;
  amountInfo?: { amount?: string; networkFee?: string };
}

/**
 * Fireblocks Orders API request (POST /v1/trading/orders).
 *
 * We use a MARKET SELL order with PREFUNDED settlement:
 *   - via: the connected MTLco account (PROVIDER_ACCOUNT + providerId + accountId)
 *   - side: SELL — give base (USD), receive quote (USDC)
 *   - settlement: PREFUNDED — destination ONE_TIME_ADDRESS (recipient wallet)
 *
 * providerId is "FIREBLOCKS_TESTNET" on testnet / "FIREBLOCKS" on mainnet.
 */
export interface FireblocksOrderRequest {
  via: {
    type: "PROVIDER_ACCOUNT";
    /** Internal Fireblocks UUID for the connected MTLco account */
    accountId: string;
    /** Trading provider: "FIREBLOCKS_TESTNET" (testnet) or "FIREBLOCKS" (mainnet) */
    providerId: string;
  };
  executionRequestDetails: {
    type: "MARKET";
    /** SELL: give base (USD), receive quote (USDC) */
    side: "SELL";
    /** USD amount to spend, as a string */
    baseAmount: string;
    /** Source asset — fiat USD from the connected account */
    baseAssetId: "USD";
    /** Target asset — USDC on Sepolia (or mainnet) */
    quoteAssetId: string;
  };
  settlement: {
    type: "PREFUNDED";
    /** Recipient one-time wallet address for USDC payout */
    destinationAccount: {
      type: "ONE_TIME_ADDRESS";
      address: string;
    };
  };
  /** Visa Direct clientReferenceId / transactionId for traceability */
  customerInternalReferenceId?: string;
  /** Human-readable label (e.g. recipient name) for audit trail */
  note?: string;
}

/** Partial response from POST /v1/trading/orders (202 Accepted) */
export interface FireblocksOrderResponse {
  id: string;
  status: string;
  createdAt: string;
  side?: string;
  baseAmount?: string;
  baseAssetId?: string;
  quoteAssetId?: string;
  quoteAmount?: string;
}

/** Response from GET /v1/trading/orders/:id */
export interface FireblocksOrderStatus {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  failure?: { reason?: string; message?: string };
}

function decodePem(raw: string): string {
  // If the value is already PEM, return as-is
  if (raw.trimStart().startsWith("-----BEGIN")) return raw;
  // Otherwise assume base64-encoded PEM
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

  const payload = {
    uri: path,
    nonce: randomUUID(),
    iat: now,
    exp: now + 30,
    sub: apiKey,
    bodyHash,
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

function authHeaders(
  apiKey: string,
  privateKey: string,
  path: string,
  body: unknown,
): Record<string, string> {
  const token = buildAuthJwt(apiKey, privateKey, path, body);
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    Authorization: `Bearer ${token}`,
  };
}

async function fbRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = env.FIREBLOCKS_API_KEY;
  const apiSecretRaw = env.FIREBLOCKS_API_SECRET;

  if (!apiKey || !apiSecretRaw) {
    throw new Error("Fireblocks credentials not configured");
  }

  const privateKey = decodePem(apiSecretRaw);
  const headers = authHeaders(apiKey, privateKey, path, body ?? null);

  const res = await fetch(`${FIREBLOCKS_BASE}${path}`, {
    method,
    headers,
    ...(body != null ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fireblocks ${method} ${path} → HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

/** A single order from GET /v1/trading/orders */
export interface FireblocksOrder {
  id: string;
  status: string;
  side: string;
  baseAmount: string;
  baseAssetId: string;
  quoteAssetId: string;
  quoteAmount: string | null;
  createdAt: string;
  updatedAt?: string;
  customerInternalReferenceId?: string;
  note?: string;
  destination?: {
    type: string;
    address?: string;   // present when type === "ONE_TIME_ADDRESS"
    accountId?: string; // present for internal account types
  };
  source?: {
    type: string;
    accountId?: string;
  };
}

/**
 * List Fireblocks trading orders (GET /v1/trading/orders).
 * Returns up to `pageSize` most-recent orders (default 50).
 * Returns empty array if credentials are not configured.
 */
export async function listOrders(
  pageSize = 50,
): Promise<FireblocksOrder[]> {
  if (!env.FIREBLOCKS_API_KEY || !env.FIREBLOCKS_API_SECRET) {
    return [];
  }

  const result = await fbRequest<{ data: FireblocksOrder[] }>(
    "GET",
    `/v1/trading/orders?pageSize=${pageSize}`,
  );
  return result.data ?? [];
}

/**
 * Submit a Fireblocks trading order (POST /v1/trading/orders).
 *
 * Converts USD from the connected MTLco exchange account into USDC,
 * settling directly to the recipient's one-time wallet address.
 * Returns 202 Accepted with an OrderSummary (id + status).
 *
 * Falls back to a mock response when credentials are not configured.
 */
export async function createOrder(
  request: FireblocksOrderRequest,
): Promise<FireblocksOrderResponse> {
  if (!env.FIREBLOCKS_API_KEY || !env.FIREBLOCKS_API_SECRET) {
    return {
      id: `mock-order-${Date.now()}`,
      status: "CREATED",
      createdAt: new Date().toISOString(),
    };
  }

  return fbRequest<FireblocksOrderResponse>("POST", "/v1/trading/orders", request);
}

/**
 * Fetch the current status of a Fireblocks order (GET /v1/trading/orders/:id).
 * Falls back to a mock COMPLETED state when credentials are not configured.
 */
export async function getOrderStatus(
  orderId: string,
): Promise<FireblocksOrderStatus> {
  if (!env.FIREBLOCKS_API_KEY || !env.FIREBLOCKS_API_SECRET) {
    return {
      id: orderId,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
    };
  }

  return fbRequest<FireblocksOrderStatus>("GET", `/v1/trading/orders/${orderId}`);
}
