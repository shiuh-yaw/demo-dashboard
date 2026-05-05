/**
 * Fireblocks Orders API client
 *
 * Wraps `POST/GET /v1/trading/orders` (Fireblocks DVP / Network trading).
 * Used by demos that route fiat ↔ stablecoin flows through Fireblocks
 * Network listings (MTLco, alfredPay, etc.) rather than calling each
 * provider's REST API directly.
 *
 * Auth: RS256 JWT signed per request, body hashed with SHA-256, sent in
 *       the `Authorization: Bearer …` header alongside `X-API-Key`.
 *
 * D-005: every helper takes an explicit `env: 'sandbox' | 'production'`.
 *        Default at the call site, not in the helper.
 *
 * @see https://developers.fireblocks.com/reference/listtradingorders
 * @see https://developers.fireblocks.com/reference/createorder
 */

import { createHash, randomUUID } from "node:crypto";
import { SignJWT, importPKCS8 } from "jose";

// ─── Public types ────────────────────────────────────────────────────────────

export type ProviderEnvironment = "sandbox" | "production";

export type OrderSide = "BUY" | "SELL";

/**
 * Settlement modes Fireblocks supports for trading orders.
 *
 * - `PREFUNDED` — caller transfers the base asset up-front; Fireblocks
 *   releases the quote on receipt. Used by MTLco-style on-ramps.
 * - `DVP` — Delivery vs. Payment; counterparty escrow ensures atomic
 *   exchange. Used by alfredPay-style off-ramps.
 *
 * The Fireblocks API may add more values over time; consumers should
 * treat unknown strings as opaque.
 */
export type OrderSettlementType = "PREFUNDED" | "DVP";

/**
 * Single trading order returned by `GET /v1/trading/orders`.
 * Mirrors the public Fireblocks Orders API; only the fields we observe
 * across consuming apps are typed. The object is otherwise treated as a
 * read-only record so callers can pull additional metadata when needed.
 */
export interface FireblocksOrder {
  id: string;
  status: string;
  side?: OrderSide | string;
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
    /** Present when type === "ONE_TIME_ADDRESS". */
    address?: string;
    accountId?: string;
  };
  source?: {
    type: string;
    accountId?: string;
  };
  /** Fireblocks may include an exchange rate on filled orders. */
  rate?: number;
  /** ISO timestamp; quoted orders expire after a short window. */
  expiresAt?: string;
  /** Some flows surface a delivery / deposit address on the order itself. */
  depositAddress?: string;
  deliveryAddress?: string;
  /** Settlement type echoed back when applicable. */
  settlementType?: OrderSettlementType | string;
}

/**
 * Provider account routing — selects which Fireblocks Network listing
 * processes the order. Always required for `createOrder`.
 */
export interface ProviderAccountRef {
  providerId: string;
  accountId: string;
}

export interface OrderBeneficiary {
  accountName: string;
  bank: string;
  clabe: string;
  accountNumber: string;
}

export interface CreateOrderParams {
  side: OrderSide;
  baseAmount: string;
  baseAssetId: string;
  quoteAssetId: string;
  /** PREFUNDED routes use a destination account; DVP uses beneficiary. */
  settlementType: OrderSettlementType;
  via: ProviderAccountRef;
  /** Required for PREFUNDED settlement. */
  destinationAddress?: string;
  /** Required for DVP settlement (off-ramps to a bank account). */
  beneficiary?: OrderBeneficiary;
  /** Caller-defined idempotency / audit reference. */
  customerInternalReferenceId?: string;
  note?: string;
  /** Order type ("MARKET" by default). */
  type?: "MARKET" | "LIMIT";
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
  /** Echoed back so consumers don't need a separate `getOrder` round-trip. */
  raw: FireblocksOrder;
}

export interface ListOrdersOptions {
  /** Default: 50. The Fireblocks API caps `pageSize`; consult their docs. */
  pageSize?: number;
}

/**
 * Auth client for Orders API calls.
 *
 * Distinct from `FireblocksClient` because the Orders API is a separate
 * REST surface from the SDK-managed vault/transaction APIs. Kept narrow
 * so callers can supply credentials without instantiating the full SDK.
 */
export interface FireblocksOrdersClient {
  apiKey: string;
  /** PEM-encoded private key. Accepts already-decoded PEM or base64 input. */
  apiSecretPem: string;
  /** Provider environment — see D-005. */
  env: ProviderEnvironment;
  /**
   * Override the API base URL. Defaults to the production Fireblocks
   * host; sandbox routes to the sandbox host. Useful for tests.
   */
  baseUrl?: string;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Surfaced when Fireblocks returns a non-2xx response. Carries the HTTP
 * status and the parsed (or raw) response body so callers can decide
 * whether to retry, fall back to mock mode, or fail loudly.
 */
export class FireblocksOrdersError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: unknown;

  constructor(status: number, path: string, body: unknown) {
    const summary =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : `Fireblocks request failed (${status})`;
    super(summary);
    this.name = "FireblocksOrdersError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDERS_PATH = "/v1/trading/orders";

const PRODUCTION_BASE_URL = "https://api.fireblocks.io";
const SANDBOX_BASE_URL = "https://sandbox-api.fireblocks.io";

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Accepts a PEM-formatted RSA key OR a base64-encoded PEM (the latter
 * happens when secrets are smuggled through env vars that strip
 * newlines). Returns canonical PEM.
 */
function decodePem(raw: string): string {
  if (raw.trimStart().startsWith("-----BEGIN")) return raw;
  return Buffer.from(raw, "base64").toString("utf-8");
}

function resolveBaseUrl(client: FireblocksOrdersClient): string {
  if (client.baseUrl) return client.baseUrl;
  return client.env === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * Build the RS256 JWT Fireblocks expects on every Orders API call.
 *
 * Claims (per Fireblocks REST auth):
 *   - `uri`      — request path including query string
 *   - `nonce`    — UUID v4
 *   - `iat`/`exp` — short-lived (<= 30s)
 *   - `sub`      — API key
 *   - `bodyHash` — SHA-256(body) hex (empty string for GET)
 */
async function buildAuthJwt(
  apiKey: string,
  privateKeyPem: string,
  path: string,
  body: unknown,
): Promise<string> {
  const bodyStr = body != null ? JSON.stringify(body) : "";
  const bodyHash = createHash("sha256").update(bodyStr).digest("hex");
  const now = Math.floor(Date.now() / 1000);

  const key = await importPKCS8(privateKeyPem, "RS256");

  return new SignJWT({
    uri: path,
    nonce: randomUUID(),
    iat: now,
    exp: now + 30,
    sub: apiKey,
    bodyHash,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);
}

async function readJsonOrText(res: Response): Promise<unknown> {
  // Some Fireblocks error responses are HTML (gateway errors) — fall
  // through to text() so the caller still gets useful diagnostics.
  try {
    return await res.json();
  } catch {
    return { raw: await res.text() };
  }
}

async function ordersFetch<T>(
  client: FireblocksOrdersClient,
  method: "GET" | "POST",
  path: string,
  body: unknown,
): Promise<T> {
  const baseUrl = resolveBaseUrl(client);
  const privateKey = decodePem(client.apiSecretPem);
  const token = await buildAuthJwt(client.apiKey, privateKey, path, body);

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": client.apiKey,
      Authorization: `Bearer ${token}`,
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await readJsonOrText(res);

  if (!res.ok) {
    throw new FireblocksOrdersError(res.status, path, data);
  }

  return data as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the most-recent trading orders. Returns up to `pageSize` entries
 * (default 50). Bubbles up `FireblocksOrdersError` on non-2xx responses
 * — callers that want a "soft" empty fallback (missing-credentials,
 * mock mode) should catch and decide locally.
 *
 * @example
 * ```ts
 * const orders = await listOrders(
 *   { apiKey, apiSecretPem, env: 'sandbox' },
 *   { pageSize: 100 },
 * );
 * ```
 */
export async function listOrders(
  client: FireblocksOrdersClient,
  opts: ListOrdersOptions = {},
): Promise<FireblocksOrder[]> {
  const pageSize = opts.pageSize ?? 50;
  const path = `${ORDERS_PATH}?pageSize=${pageSize}`;

  const json = await ordersFetch<{ data?: FireblocksOrder[] }>(
    client,
    "GET",
    path,
    null,
  );
  return json.data ?? [];
}

/**
 * Fetch a single trading order by its Fireblocks id.
 *
 * @example
 * ```ts
 * const order = await getOrder(client, 'ord_abc123');
 * ```
 */
export async function getOrder(
  client: FireblocksOrdersClient,
  orderId: string,
): Promise<FireblocksOrder> {
  const path = `${ORDERS_PATH}/${encodeURIComponent(orderId)}`;
  return ordersFetch<FireblocksOrder>(client, "GET", path, null);
}

/**
 * Submit a new trading order. The body shape follows the Fireblocks
 * Orders API; common provider-specific helpers live in
 * `packages/fireblocks/src/providers/<partner>.ts`.
 */
export async function createOrder(
  client: FireblocksOrdersClient,
  params: CreateOrderParams,
): Promise<CreateOrderResult> {
  const settlementBlock =
    params.settlementType === "DVP"
      ? params.beneficiary
        ? { settlementType: "DVP" }
        : (() => {
            throw new Error(
              "createOrder: beneficiary is required for DVP settlement",
            );
          })()
      : params.destinationAddress
        ? {
            settlement: {
              type: "PREFUNDED",
              destinationAccount: {
                type: "ONE_TIME_ADDRESS",
                address: params.destinationAddress,
              },
            },
          }
        : (() => {
            throw new Error(
              "createOrder: destinationAddress is required for PREFUNDED settlement",
            );
          })();

  // DVP carries `settlementType` inside `executionRequestDetails`;
  // PREFUNDED carries the full `settlement` block at the root.
  // The Fireblocks API tolerates the difference per provider.
  const executionRequestDetails: Record<string, unknown> = {
    type: params.type ?? "MARKET",
    side: params.side,
    baseAmount: params.baseAmount,
    baseAssetId: params.baseAssetId,
    quoteAssetId: params.quoteAssetId,
    ...(params.settlementType === "DVP"
      ? { settlementType: "DVP" }
      : {}),
  };

  const body: Record<string, unknown> = {
    via: {
      type: "PROVIDER_ACCOUNT",
      providerId: params.via.providerId,
      accountId: params.via.accountId,
    },
    executionRequestDetails,
    ...(params.settlementType === "PREFUNDED"
      ? settlementBlock
      : { beneficiary: params.beneficiary }),
    ...(params.customerInternalReferenceId
      ? { customerInternalReferenceId: params.customerInternalReferenceId }
      : {}),
    ...(params.note ? { note: params.note } : {}),
  };

  const raw = await ordersFetch<FireblocksOrder>(
    client,
    "POST",
    ORDERS_PATH,
    body,
  );

  return {
    orderId: raw.id,
    status: raw.status,
    raw,
  };
}
