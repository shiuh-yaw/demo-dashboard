import { randomUUID } from "crypto";
import { env } from "./env";

export type BlockchainType = "Ethereum" | "Base" | "Polygon" | "Arbitrum";
export type RampStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface OfframpQuote {
  id: string;
  source_currency: string;
  destination_currency: string;
  source_amount_usdc: number;
  destination_amount_usd: number;
  exchange_rate: number;
  total_fee_usd: number;
  expires_at: string;
}

export interface OfframpResult {
  id: string;
  status: RampStatus;
  source_amount_usdc: number;
  destination_amount_usd: number;
  created_at: string;
}

const IRON_CHAIN_MAP: Record<number, BlockchainType> = {
  84532: "Base",
  8453: "Base",
  11155111: "Ethereum",
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum",
};

export function chainIdToBlockchain(chainId: number): BlockchainType {
  const mapped = IRON_CHAIN_MAP[chainId];
  if (!mapped) {
    throw new Error(`Unsupported chainId for IRON off-ramp: ${chainId}`);
  }
  return mapped;
}

function getApiUrl(): string {
  return env.IRON_ENVIRONMENT === "sandbox"
    ? "https://api.sandbox.iron.xyz"
    : "https://api.iron.xyz";
}

function getHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json; charset=utf-8",
    "X-API-Key": env.IRON_API_KEY ?? "",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseQuoteResponse(data: any, sourceUsdc: number): OfframpQuote {
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

function parseAutorampStatus(status: string): RampStatus {
  const map: Record<string, RampStatus> = {
    Created: "pending",
    EditPending: "pending",
    Authorized: "processing",
    DepositAccountAdded: "processing",
    Approved: "completed",
    Rejected: "failed",
    Cancelled: "cancelled",
  };
  return map[status] ?? "pending";
}

export async function getOfframpQuote(
  amountUsdc: number,
  blockchain: BlockchainType,
): Promise<OfframpQuote> {
  const customerId = env.IRON_DEMO_CUSTOMER_ID;
  const bankIban = env.IRON_DEMO_BANK_IBAN;

  if (!customerId || !bankIban) {
    throw new Error(
      "IRON_DEMO_CUSTOMER_ID and IRON_DEMO_BANK_IBAN are required",
    );
  }

  const params = new URLSearchParams({
    customer_id: customerId,
    source_currency_code: "USDC",
    source_currency_chain: blockchain,
    destination_currency_code: "USD",
    recipient_account: bankIban,
    rate_expiry_policy: "Return",
    expiry_in_hours: "1",
    is_third_party: "false",
    amount_in: amountUsdc.toString(),
  });

  const res = await fetch(
    `${getApiUrl()}/api/autoramps/quote?${params.toString()}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  const data = await handleResponse<Record<string, unknown>>(res);
  return parseQuoteResponse(data, amountUsdc);
}

export async function createOfframp(
  quoteId: string,
  blockchain: BlockchainType,
): Promise<OfframpResult> {
  const customerId = env.IRON_DEMO_CUSTOMER_ID;
  const bankIban = env.IRON_DEMO_BANK_IBAN;

  if (!customerId || !bankIban) {
    throw new Error(
      "IRON_DEMO_CUSTOMER_ID and IRON_DEMO_BANK_IBAN are required",
    );
  }

  const body = {
    customer_id: customerId,
    destination_currency: { type: "Fiat", code: "USD" },
    recipient_account: {
      type: "Fiat",
      account_identifier: { type: "ACH", iban: bankIban },
    },
    source_currencies: [{ type: "Crypto", blockchain, token: "USDC" }],
    quote_id: quoteId,
  };

  const res = await fetch(`${getApiUrl()}/api/autoramps`, {
    method: "POST",
    headers: getHeaders(randomUUID()),
    body: JSON.stringify(body),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await handleResponse<any>(res);
  return {
    id: data.id ?? "",
    status: parseAutorampStatus(data.status ?? "Created"),
    source_amount_usdc: parseFloat(data.quote?.amount_in?.amount ?? "0"),
    destination_amount_usd: parseFloat(data.quote?.amount_out?.amount ?? "0"),
    created_at: data.created_at ?? new Date().toISOString(),
  };
}
