/**
 * Simple offramp helpers — extracted from `apps/proceeds/lib/iron.ts`.
 *
 * These are the minimal "USDC → USD via demo bank IBAN" helpers used by the
 * proceeds app. They differ from `IronFinanceClient` in that:
 *   1. They take `(amountUsdc, blockchain)` directly (no quote object).
 *   2. They require `customerId` + `bankIban` to be passed in by the caller
 *      (consumer-side env-reader; the package never reads `process.env`).
 *   3. They use ACH (vs the dashboard's SEPA default).
 *
 * Sandbox-by-default per D-005. Callers pass an explicit `env` —
 * `sandbox` (default) or `production`.
 *
 * The dashboard uses `IronFinanceClient` directly; proceeds uses these helpers
 * via `apps/proceeds/lib/iron-env.ts` (the sanctioned env-reader on the
 * consumer side). Both share `env.ts` + `state-mapping.ts`.
 */

import { randomUUID } from "node:crypto";
import { resolveIronBaseUrl, type IronEnvironment } from "./env";

/**
 * Subset of `BlockchainType` supported by the proceeds offramp helper.
 * Kept narrow to mirror the original proceeds chain map.
 */
export type SimpleOfframpBlockchain =
  | "Ethereum"
  | "Base"
  | "Polygon"
  | "Arbitrum";

export type SimpleOfframpStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface SimpleOfframpQuote {
  id: string;
  source_currency: string;
  destination_currency: string;
  source_amount_usdc: number;
  destination_amount_usd: number;
  exchange_rate: number;
  total_fee_usd: number;
  expires_at: string;
}

export interface SimpleOfframpResult {
  id: string;
  status: SimpleOfframpStatus;
  source_amount_usdc: number;
  destination_amount_usd: number;
  created_at: string;
}

const IRON_CHAIN_MAP: Record<number, SimpleOfframpBlockchain> = {
  84532: "Base",
  8453: "Base",
  11155111: "Ethereum",
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum",
};

/**
 * Map an EVM `chainId` to the Iron `BlockchainType`. Throws when the chain id
 * is not in the supported set.
 */
export function chainIdToBlockchain(chainId: number): SimpleOfframpBlockchain {
  const mapped = IRON_CHAIN_MAP[chainId];
  if (!mapped) {
    throw new Error(`Unsupported chainId for IRON off-ramp: ${chainId}`);
  }
  return mapped;
}

/**
 * Required config for the simple offramp helpers. The caller must source these
 * values (the package never reads `process.env`). `env` is optional and
 * defaults to `sandbox` per D-005.
 */
export interface SimpleOfframpConfig {
  apiKey: string;
  customerId: string;
  /** IBAN for SEPA bank accounts. */
  bankIban?: string;
  /** ACH routing number (required for ACH, mutually exclusive with bankIban). */
  routingNumber?: string;
  /** ACH account number (required for ACH, mutually exclusive with bankIban). */
  accountNumber?: string;
  env?: IronEnvironment;
  fetchImpl?: typeof fetch;
}

interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  customerId: string;
  bankIban?: string;
  routingNumber?: string;
  accountNumber?: string;
  fetchImpl: typeof fetch;
}

function resolveConfig(config: SimpleOfframpConfig): ResolvedConfig {
  if (!config.apiKey) {
    throw new Error("apiKey is required");
  }
  if (!config.customerId) {
    throw new Error("customerId is required");
  }
  const hasIban = !!config.bankIban;
  const hasAch = !!config.routingNumber && !!config.accountNumber;
  if (!hasIban && !hasAch) {
    throw new Error(
      "Either bankIban (SEPA) or routingNumber + accountNumber (ACH) is required",
    );
  }

  return {
    apiKey: config.apiKey,
    baseUrl: resolveIronBaseUrl(config.env ?? "sandbox"),
    customerId: config.customerId,
    bankIban: config.bankIban,
    routingNumber: config.routingNumber,
    accountNumber: config.accountNumber,
    fetchImpl: config.fetchImpl ?? globalThis.fetch.bind(globalThis),
  };
}

function getHeaders(
  apiKey: string,
  idempotencyKey?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json; charset=utf-8",
    "X-API-Key": apiKey,
  };
  if (idempotencyKey) headers["IDEMPOTENCY-KEY"] = idempotencyKey;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Iron API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface RawIronQuoteResponse {
  quote_id?: string;
  amount_out?: {
    amount?: string;
    currency?: { code?: string };
  };
  rate?: string;
  fee?: {
    total_fee?: { amount?: string };
  };
  valid_until?: string;
}

function parseQuoteResponse(
  data: RawIronQuoteResponse,
  sourceUsdc: number,
): SimpleOfframpQuote {
  const destAmount = parseFloat(data.amount_out?.amount ?? "0");
  const rate = parseFloat(data.rate ?? "1");
  const totalFee = parseFloat(data.fee?.total_fee?.amount ?? "0");
  return {
    id: data.quote_id ?? "",
    source_currency: "USDC",
    destination_currency: data.amount_out?.currency?.code ?? "USD",
    source_amount_usdc: sourceUsdc,
    destination_amount_usd: destAmount,
    exchange_rate: rate,
    total_fee_usd: totalFee,
    expires_at:
      data.valid_until ?? new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function parseAutorampStatus(status: string): SimpleOfframpStatus {
  const map: Record<string, SimpleOfframpStatus> = {
    Created: "pending",
    EditPending: "pending",
    Authorized: "processing",
    DepositAccountAdded: "processing",
    Approved: "processing",
    Rejected: "failed",
    Cancelled: "cancelled",
  };
  return map[status] ?? "pending";
}

/**
 * Get a USDC → USD offramp quote. `config` carries the demo customer + IBAN —
 * consumers source these from their own env-reader and pass them in.
 */
export async function getOfframpQuote(
  amountUsdc: number,
  blockchain: SimpleOfframpBlockchain,
  config: SimpleOfframpConfig,
): Promise<SimpleOfframpQuote> {
  const { apiKey, baseUrl, customerId, bankIban, accountNumber, fetchImpl } =
    resolveConfig(config);

  const recipientAccount = bankIban ?? accountNumber ?? "";
  const params = new URLSearchParams({
    customer_id: customerId,
    source_currency_code: "USDC",
    source_currency_chain: blockchain,
    destination_currency_code: "USD",
    recipient_account: recipientAccount,
    rate_expiry_policy: "Return",
    expiry_in_hours: "1",
    is_third_party: "false",
    amount_in: amountUsdc.toString(),
  });

  const res = await fetchImpl(
    `${baseUrl}/api/autoramps/quote?${params.toString()}`,
    { method: "GET", headers: getHeaders(apiKey) },
  );

  const data = await handleResponse<RawIronQuoteResponse>(res);
  return parseQuoteResponse(data, amountUsdc);
}

interface RawAutorampResponse {
  id?: string;
  status?: string;
  created_at?: string;
  quote?: {
    amount_in?: { amount?: string };
    amount_out?: { amount?: string };
  };
}

/**
 * Create a USDC → USD offramp. `config` carries the demo customer + IBAN —
 * consumers source these from their own env-reader and pass them in.
 */
/**
 * Build the correct account_identifier based on available credentials.
 */
function buildAccountIdentifier(cfg: ResolvedConfig) {
  if (cfg.routingNumber && cfg.accountNumber) {
    return {
      type: "ACH" as const,
      routing_number: cfg.routingNumber,
      account_number: cfg.accountNumber,
    };
  }
  return { type: "SEPA" as const, iban: cfg.bankIban! };
}

export async function createOfframp(
  quoteId: string,
  blockchain: SimpleOfframpBlockchain,
  config: SimpleOfframpConfig,
): Promise<SimpleOfframpResult> {
  const resolved = resolveConfig(config);
  const { apiKey, baseUrl, customerId, fetchImpl } = resolved;

  const body = {
    customer_id: customerId,
    destination_currency: { type: "Fiat", code: "USD" },
    recipient_account: {
      type: "Fiat",
      account_identifier: buildAccountIdentifier(resolved),
    },
    source_currencies: [{ type: "Crypto", blockchain, token: "USDC" }],
    quote_id: quoteId,
  };

  const res = await fetchImpl(`${baseUrl}/api/autoramps`, {
    method: "POST",
    headers: getHeaders(apiKey, randomUUID()),
    body: JSON.stringify(body),
  });

  const data = await handleResponse<RawAutorampResponse>(res);
  return {
    id: data.id ?? "",
    status: parseAutorampStatus(data.status ?? "Created"),
    source_amount_usdc: parseFloat(data.quote?.amount_in?.amount ?? "0"),
    destination_amount_usd: parseFloat(data.quote?.amount_out?.amount ?? "0"),
    created_at: data.created_at ?? new Date().toISOString(),
  };
}
