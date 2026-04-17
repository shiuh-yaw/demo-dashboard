/**
 * Fireblocks Orders API client (server-only)
 *
 * Uses /v1/trading/orders with RS256 JWT auth (mirrors visa-direct pattern).
 *
 * ─── Demo tweak (temporary) ──────────────────────────────────────────────────
 * AlfredPay is not yet connected in this workspace. Until it is:
 *   - createOfframpOrder() is STUBBED — marked with ⚠️ STUB in console logs
 *   - After MTLco on-ramp order succeeds, a separate USDC vault transfer is
 *     fired (POST /v1/transactions, fire-and-forget) to the deposit address.
 *     This transfer is hidden from the UI but will trigger AlfredPay's
 *     off-ramp settlement once alfredPay is connected.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import { env } from "./env";

const FIREBLOCKS_BASE = "https://api.fireblocks.io";
const ORDERS_PATH = "/v1/trading/orders";
const TRANSACTIONS_PATH = "/v1/transactions";

// ─── Auth helpers (mirrored from visa-direct/lib/api/fireblocks.ts) ───────────

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

function getCredentials(): { apiKey: string; privateKey: string } {
  const apiKey = env.FIREBLOCKS_API_KEY;
  const apiSecretRaw = env.FIREBLOCKS_API_SECRET;
  if (!apiKey || !apiSecretRaw) {
    throw new Error(
      "FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET must be set in .env.local",
    );
  }
  return { apiKey, privateKey: decodePem(apiSecretRaw) };
}

async function fbPost<T>(path: string, body: unknown): Promise<T> {
  const { apiKey, privateKey } = getCredentials();
  const token = buildAuthJwt(apiKey, privateKey, path, body);

  console.log(`[Fireblocks] POST ${path}`, JSON.stringify(body, null, 2));

  const res = await fetch(`${FIREBLOCKS_BASE}${path}`, {
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

  console.log(
    `[Fireblocks] Response ${res.status}`,
    JSON.stringify(data, null, 2),
  );

  if (!res.ok) {
    throw new Error(`Fireblocks ${res.status}: ${JSON.stringify(data)}`);
  }

  return data as T;
}

// ─── Public result types ─────────────────────────────────────────────────────

export interface OfframpOrderResult {
  orderId: string;
  depositAddress: string;
  blockchain: string;
  rate: number;
  expiresAt: string;
  stub: boolean; // true while alfredPay not connected
}

export interface OnrampOrderResult {
  orderId: string;
  status: string;
}

// ─── Step 1 — AlfredPay DVP off-ramp (⚠️ STUBBED) ──────────────────────────
//
// Replace this stub with a real /v1/trading/orders call once alfredPay is
// connected in the Fireblocks console and FIREBLOCKS_ALFRED_ACCOUNT_ID is set.

interface Beneficiary {
  accountName: string;
  bank: string;
  clabe: string;
  accountNumber: string;
}

interface OfframpOrderParams {
  amountUSDC: number;
  beneficiary: Beneficiary;
}

// Deterministic-looking testnet deposit address for demo consistency
const STUB_DEPOSIT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const STUB_RATE = 19.14; // approx MXN/USDC placeholder
let stubOrderCounter = 1000;

export async function createOfframpOrder(
  params: OfframpOrderParams,
): Promise<OfframpOrderResult> {
  if (env.FIREBLOCKS_ALFRED_ACCOUNT_ID) {
    // ── Real path — alfredPay is connected ────────────────────────────────
    interface TradingOrderResponse {
      id: string;
      status: string;
      depositAddress?: string;
      deliveryAddress?: string;
      destination?: { address?: string };
      rate?: number;
      expiresAt?: string;
    }

    const body = {
      via: {
        type: "PROVIDER_ACCOUNT",
        providerId: env.FIREBLOCKS_ALFRED_PROVIDER_ID,
        accountId: env.FIREBLOCKS_ALFRED_ACCOUNT_ID,
      },
      executionRequestDetails: {
        type: "MARKET",
        side: "SELL",
        baseAmount: String(params.amountUSDC),
        baseAssetId: env.FIREBLOCKS_OFFRAMP_ASSET_ID,
        quoteAssetId: "MXN",
        settlementType: "DVP",
      },
      beneficiary: params.beneficiary,
    };

    const raw = await fbPost<TradingOrderResponse>(ORDERS_PATH, body);
    const depositAddress =
      raw.depositAddress ??
      raw.deliveryAddress ??
      raw.destination?.address ??
      "";

    return {
      orderId: raw.id,
      depositAddress,
      blockchain: "Ethereum",
      rate: raw.rate ?? STUB_RATE,
      expiresAt:
        raw.expiresAt ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      stub: false,
    };
  }

  // ── Stub path — alfredPay not yet connected ────────────────────────────────
  const orderId = `STUB-ALFRED-${Date.now()}-${stubOrderCounter++}`;
  console.log(
    `⚠️  [STUB] AlfredPay off-ramp — alfredPay not connected, returning placeholder data`,
  );
  console.log(
    `⚠️  [STUB] orderId=${orderId} depositAddress=${STUB_DEPOSIT_ADDRESS} rate=${STUB_RATE}`,
  );
  console.log(
    `⚠️  [STUB] beneficiary:`,
    JSON.stringify(params.beneficiary, null, 2),
  );

  await new Promise((r) => setTimeout(r, 600)); // simulate network latency

  return {
    orderId,
    depositAddress: STUB_DEPOSIT_ADDRESS,
    blockchain: "Ethereum",
    rate: STUB_RATE,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    stub: true,
  };
}

// ─── Step 2 — MTLco PREFUNDED on-ramp (REAL) ─────────────────────────────────

interface OnrampOrderParams {
  amountUSDC: number;
  depositAddress: string;
}

export async function createOnrampOrder(
  params: OnrampOrderParams,
): Promise<OnrampOrderResult> {
  if (!env.FIREBLOCKS_MTLCO_ACCOUNT_ID) {
    throw new Error("FIREBLOCKS_MTLCO_ACCOUNT_ID is not set in .env.local");
  }

  interface TradingOrderResponse {
    id: string;
    status: string;
  }

  const body = {
    via: {
      type: "PROVIDER_ACCOUNT",
      providerId: env.FIREBLOCKS_MTLCO_PROVIDER_ID,
      accountId: env.FIREBLOCKS_MTLCO_ACCOUNT_ID,
    },
    executionRequestDetails: {
      type: "MARKET",
      side: "SELL",
      baseAmount: String(params.amountUSDC),
      baseAssetId: "USD",
      quoteAssetId: env.FIREBLOCKS_OFFRAMP_ASSET_ID,
    },
    settlement: {
      type: "PREFUNDED",
      destinationAccount: {
        type: "ONE_TIME_ADDRESS",
        address: params.depositAddress,
      },
    },
  };

  const raw = await fbPost<TradingOrderResponse>(ORDERS_PATH, body);
  return { orderId: raw.id, status: raw.status };
}

// ─── Hidden tweak — vault USDC → deposit address (fire-and-forget) ─────────
//
// Sends USDC from the Treasury vault directly to the alfredPay deposit address.
// This simulates what MTLco would do in production (PREFUNDED settlement).
// Hidden from UI. Logged with [TWEAK] prefix so it's easy to identify.
// Safe to ignore errors — this is supplementary to the MTLco order.

interface FireblocksTransaction {
  id: string;
  status: string;
}

export async function transferUsdcToDepositAddress(params: {
  amountUSDC: number;
  depositAddress: string;
  disbursementId: string;
  stub: boolean;
}): Promise<void> {
  try {
    const rawKey = env.FIREBLOCKS_TWEAK_API_KEY;
    const rawSecret = env.FIREBLOCKS_TWEAK_API_SECRET;
    if (!rawKey || !rawSecret) {
      console.warn(`[TWEAK] Skipping — FIREBLOCKS_TWEAK_API_KEY / FIREBLOCKS_TWEAK_API_SECRET not set`);
      return;
    }

    const tweakApiKey = rawKey;
    const tweakPrivateKey = decodePem(rawSecret);

    const assetId = env.FIREBLOCKS_TWEAK_ASSET_ID;

    console.log(
      `[TWEAK] ${params.stub ? "Stub deposit addr" : "Real deposit addr"} — tweak env (${tweakApiKey.slice(0, 8)}…): asset=${assetId}`,
    );

    const vaultId = env.FIREBLOCKS_VAULT_ACCOUNT_ID ?? "0";

    const body = {
      assetId,
      source: { type: "VAULT_ACCOUNT", id: vaultId },
      destination: {
        type: "ONE_TIME_ADDRESS",
        oneTimeAddress: { address: params.depositAddress },
      },
      amount: String(params.amountUSDC),
      note: `[TWEAK] Cross-border AP/AR demo — ${params.disbursementId} — USDC to alfredPay OTA`,
    };

    console.log(
      `[TWEAK] Firing transfer: vault${vaultId} → ${params.depositAddress} (${params.amountUSDC} ${assetId})`,
    );

    const token = buildAuthJwt(tweakApiKey, tweakPrivateKey, TRANSACTIONS_PATH, body);
    const res = await fetch(`${FIREBLOCKS_BASE}${TRANSACTIONS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": tweakApiKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    let data: unknown;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }

    if (!res.ok) {
      console.error(`[TWEAK] Vault transfer HTTP ${res.status}:`, JSON.stringify(data));
      return;
    }

    const result = data as FireblocksTransaction;
    console.log(
      `[TWEAK] Vault transfer submitted: txId=${result.id} status=${result.status}`,
    );
  } catch (err) {
    console.error(
      `[TWEAK] Vault transfer failed (non-blocking):`,
      err instanceof Error ? err.message : err,
    );
  }
}
