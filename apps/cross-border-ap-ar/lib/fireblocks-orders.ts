/**
 * Cross-border AP/AR Fireblocks orchestration (server-only).
 *
 * The shared `/v1/trading/orders` client and the MTLco / alfredPay
 * Fireblocks-Network-listing wrappers live in
 * `@dynamic-demos/fireblocks` (Phase 1A). Everything in this file is
 * cross-border-ap-ar-specific glue:
 *
 *   - The alfredPay off-ramp **stub** that runs while alfredPay is not
 *     yet connected in this Fireblocks workspace.
 *   - The hidden `transferUsdcToDepositAddress` "tweak" transfer that
 *     simulates MTLco's PREFUNDED settlement during the demo using a
 *     separate Fireblocks workspace's API key.
 *
 * ─── Demo tweak (temporary) ──────────────────────────────────────────────────
 * AlfredPay is not yet connected in this workspace. Until it is:
 *   - createOfframpOrder() falls back to a STUB — marked with ⚠️ STUB in logs.
 *   - After MTLco on-ramp order succeeds, a separate USDC vault transfer is
 *     fired (POST /v1/transactions, fire-and-forget) to the deposit address.
 *     Hidden from the UI but will trigger AlfredPay's off-ramp settlement
 *     once alfredPay is connected.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import {
  Alfredpay,
  Mtlco,
  type FireblocksOrdersClient,
  type ProviderEnvironment,
} from "@dynamic-demos/fireblocks";
import { env } from "./env";

const FIREBLOCKS_BASE = "https://api.fireblocks.io";
const TRANSACTIONS_PATH = "/v1/transactions";

// ─── Auth helpers (server-only) ───────────────────────────────────────────────
//
// Used only by the hidden `transferUsdcToDepositAddress` tweak below
// (which talks to `/v1/transactions`, not the Orders API). The Orders
// auth lives in `@dynamic-demos/fireblocks`.

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

// ─── Orders client builder ────────────────────────────────────────────────────

/**
 * Sandbox-by-default per D-005. Until cross-border-ap-ar wires an
 * explicit `FIREBLOCKS_ENVIRONMENT` env var, fall back to NODE_ENV so
 * production deploys still hit `api.fireblocks.io`.
 */
function resolveEnvironment(): ProviderEnvironment {
  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

function getOrdersClient(): FireblocksOrdersClient {
  if (!env.FIREBLOCKS_API_KEY || !env.FIREBLOCKS_API_SECRET) {
    throw new Error(
      "FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET must be set in .env.local",
    );
  }
  return {
    apiKey: env.FIREBLOCKS_API_KEY,
    apiSecretPem: env.FIREBLOCKS_API_SECRET,
    env: resolveEnvironment(),
    baseUrl: FIREBLOCKS_BASE,
  };
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

// ─── Step 1 — AlfredPay DVP off-ramp (stub fallback preserved) ────────────────

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
    const result = await Alfredpay.createAlfredpayOfframpOrder(
      getOrdersClient(),
      {
        amountUsdc: params.amountUSDC,
        baseAssetId: env.FIREBLOCKS_OFFRAMP_ASSET_ID,
        quoteAssetId: "MXN",
        beneficiary: params.beneficiary,
        config: {
          providerId: env.FIREBLOCKS_ALFRED_PROVIDER_ID,
          accountId: env.FIREBLOCKS_ALFRED_ACCOUNT_ID,
        },
        env: resolveEnvironment(),
      },
    );

    const raw = result.raw;
    const depositAddress =
      raw.depositAddress ??
      raw.deliveryAddress ??
      raw.destination?.address ??
      "";

    return {
      orderId: result.orderId,
      depositAddress,
      blockchain: "Ethereum",
      rate: raw.rate ?? STUB_RATE,
      expiresAt:
        raw.expiresAt ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      stub: false,
    };
  }

  // ── Stub path — alfredPay not yet connected ────────────────────────────────
  // Kept in the app (not the package): the stub is a demo-coverage hack,
  // not a contract of the alfredPay-Fireblocks wrapper.
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

  const result = await Mtlco.createMtlcoOnrampOrder(getOrdersClient(), {
    amountUsd: params.amountUSDC,
    destinationAddress: params.depositAddress,
    quoteAssetId: env.FIREBLOCKS_OFFRAMP_ASSET_ID,
    config: {
      providerId: env.FIREBLOCKS_MTLCO_PROVIDER_ID,
      accountId: env.FIREBLOCKS_MTLCO_ACCOUNT_ID,
    },
    env: resolveEnvironment(),
  });

  return { orderId: result.orderId, status: result.status };
}

// ─── Hidden tweak — vault USDC → deposit address (fire-and-forget) ─────────
//
// Sends USDC from the Treasury vault directly to the alfredPay deposit
// address. Simulates what MTLco would do in production (PREFUNDED
// settlement). Hidden from UI. Logged with [TWEAK] prefix so it's easy
// to identify. Safe to ignore errors — supplementary to the MTLco order.
//
// Note: this calls `/v1/transactions`, not Orders — it stays raw here
// rather than moving into `@dynamic-demos/fireblocks`, which already
// exposes a richer `FireblocksClient.createTransaction` for the same
// thing if we ever need it.

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
