/**
 * Direct REST client for alfredPay (https://alfredpay.readme.io).
 *
 * Authoring notes:
 * - Sandbox-by-default per DECISIONS.md D-005.
 * - No baked-in environment variable reads — the dashboard owns that boundary.
 *   Callers (the dashboard's orchestration API, primarily) pass `env` + `apiKey`
 *   explicitly.
 * - Errors surface as `AlfredpayApiError` so the orchestration layer can map
 *   them to canonical state transitions without sniffing message strings.
 */

import { resolveAlfredpayBaseUrl } from "./env";
import {
  AlfredpayApiError,
  type AlfredpayClient,
  type AlfredpayCreateOfframpParams,
  type AlfredpayOfframp,
  type CreateAlfredpayClientOptions,
} from "./types";

/** Factory — returns an authenticated alfredPay REST client. */
export function createAlfredpayClient(
  options: CreateAlfredpayClientOptions,
): AlfredpayClient {
  if (!options || !options.apiKey) {
    throw new Error(
      "[@dynamic-demos/alfredpay] apiKey is required to create a client",
    );
  }

  const env = options.env;
  const baseUrl = resolveAlfredpayBaseUrl(env, options.baseUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    init: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers({
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
      ...init.headers,
    });

    const fetchInit: RequestInit = {
      method,
      headers,
    };
    if (init.body !== undefined) {
      fetchInit.body = JSON.stringify(init.body);
    }

    const response = await fetchImpl(url, fetchInit);

    let parsed: unknown = null;
    const text = await response.text();
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      throw new AlfredpayApiError(
        `[@dynamic-demos/alfredpay] ${method} ${path} failed: ${response.status} ${response.statusText}`,
        response.status,
        parsed,
      );
    }

    return parsed as T;
  }

  return { env, baseUrl, request };
}

/**
 * `snake_case` wire shape returned by alfredPay. We translate at the boundary
 * so the rest of the codebase stays in `camelCase`.
 */
interface AlfredpayWireOfframp {
  id: string;
  status: AlfredpayOfframp["status"];
  amount: string;
  currency: string;
  destination_currency?: string;
  country?: string;
  rail?: string;
  reference?: string;
  deposit_address?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

function mapWireOfframp(wire: AlfredpayWireOfframp): AlfredpayOfframp {
  return {
    id: wire.id,
    status: wire.status,
    amount: wire.amount,
    currency: wire.currency,
    destinationCurrency: wire.destination_currency,
    country: wire.country,
    rail: wire.rail,
    reference: wire.reference,
    depositAddress: wire.deposit_address,
    metadata: wire.metadata,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
  };
}

/**
 * Creates an offramp (USDC/USDT in → local fiat out).
 *
 * @see https://alfredpay.readme.io — `POST /v1/offramps`
 */
export async function createOfframp(
  client: AlfredpayClient,
  params: AlfredpayCreateOfframpParams,
): Promise<AlfredpayOfframp> {
  const { beneficiary, idempotencyKey, ...rest } = params;
  const body = {
    amount: rest.amount,
    currency: rest.currency,
    destination_currency: rest.destinationCurrency,
    country: rest.country,
    rail: rest.rail,
    reference: rest.reference,
    metadata: rest.metadata,
    beneficiary: {
      name: beneficiary.name,
      tax_id: beneficiary.taxId,
      pix_key: beneficiary.pixKey,
      bank_account: beneficiary.bankAccount,
      bank_code: beneficiary.bankCode,
      email: beneficiary.email,
      phone: beneficiary.phone,
    },
  };

  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["idempotency-key"] = idempotencyKey;
  }

  const wire = await client.request<AlfredpayWireOfframp>(
    "POST",
    "/v1/offramps",
    { body, headers },
  );
  return mapWireOfframp(wire);
}

/** Fetches the latest status for an offramp. */
export async function getOfframpStatus(
  client: AlfredpayClient,
  id: string,
): Promise<AlfredpayOfframp> {
  if (!id) {
    throw new Error(
      "[@dynamic-demos/alfredpay] offramp id is required to fetch status",
    );
  }
  const wire = await client.request<AlfredpayWireOfframp>(
    "GET",
    `/v1/offramps/${encodeURIComponent(id)}`,
  );
  return mapWireOfframp(wire);
}
