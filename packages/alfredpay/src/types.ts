/**
 * Shared types for the alfredPay direct REST integration.
 *
 * Field shapes are based on the public alfredPay docs (https://alfredpay.readme.io).
 * Keep them permissive at the boundary — alfredPay reserves the right to add
 * fields, and this package's job is to translate between alfredPay's wire
 * shape and the canonical CanonicalEvent / TransactionState model.
 */

import type { AlfredpayEnvironment } from "./env";

/** ISO 3166-1 alpha-2 country codes alfredPay's offramp supports today. */
export type AlfredpayCountry = "BR" | "MX" | "CO" | "AR" | "SV" | "US";

/** Payment rails alfredPay's offramp can pay out on, per country. */
export type AlfredpayRail = "pix" | "spei" | "pse" | "cbu" | "ach" | "bank";

/** Upstream alfredPay status string surfaced on transfer/offramp resources. */
export type AlfredpayStatus =
  | "received"
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed"
  | "cancelled"
  | "expired";

/** Source-asset stablecoin alfredPay accepts. */
export type AlfredpaySourceCurrency = "USD" | "USDC" | "USDT";

/**
 * Beneficiary block on `POST /v1/offramps`. Each rail uses different fields;
 * this is a discriminated-union-by-presence shape because alfredPay's docs
 * accept a flat object.
 */
export interface AlfredpayBeneficiary {
  /** Recipient legal name. */
  name?: string;
  /** Recipient government ID (CPF/CNPJ for BR, RFC/CURP for MX, etc.). */
  taxId?: string;
  /** Brazil — PIX key (email, phone, CPF/CNPJ, or random key). */
  pixKey?: string;
  /** Mexico SPEI / Argentina CBU — destination bank account (CLABE / CBU number). */
  bankAccount?: string;
  /** Bank routing identifier (ABA / BIC / branch code) when separate. */
  bankCode?: string;
  /** Email + phone for receipts/notifications. */
  email?: string;
  phone?: string;
}

export interface AlfredpayCreateOfframpParams {
  /** Source amount, in stablecoin. Decimal string preserves precision. */
  amount: string;
  /** Source currency — typically "USDC" or "USDT". */
  currency: AlfredpaySourceCurrency;
  /** Destination fiat currency (BRL, MXN, COP, ARS, USD). */
  destinationCurrency: string;
  /** ISO 3166-1 alpha-2 country of the beneficiary. */
  country: AlfredpayCountry;
  /** Local payment rail. */
  rail: AlfredpayRail;
  beneficiary: AlfredpayBeneficiary;
  /** Caller-supplied idempotency key — alfredPay echoes it on duplicate POSTs. */
  idempotencyKey?: string;
  /** Caller reference — surfaces in alfredPay dashboard for support. */
  reference?: string;
  /** Pass-through metadata; alfredPay returns it untouched on the resource. */
  metadata?: Record<string, string>;
}

export interface AlfredpayOfframp {
  id: string;
  status: AlfredpayStatus;
  amount: string;
  currency: AlfredpaySourceCurrency | string;
  destinationCurrency?: string;
  country?: AlfredpayCountry | string;
  rail?: AlfredpayRail | string;
  reference?: string;
  /**
   * Onchain deposit address the customer (or vault) sends stablecoin to.
   * alfredPay populates this on creation for offramps that require an
   * onchain leg.
   */
  depositAddress?: string;
  /** Free-form upstream metadata. */
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlfredpayClient {
  env: AlfredpayEnvironment;
  baseUrl: string;
  /** Internal — used by helpers in this package; not part of the stable surface. */
  request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    init?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T>;
}

export interface CreateAlfredpayClientOptions {
  env: AlfredpayEnvironment;
  apiKey: string;
  /** Optional override of the resolved base URL (e.g. local mock server). */
  baseUrl?: string;
  /** Optional override of `globalThis.fetch` — primarily for tests. */
  fetchImpl?: typeof fetch;
}

/**
 * Thrown when alfredPay returns a non-2xx response. Callers can branch on
 * `.status` to decide whether to retry; the upstream JSON (when available)
 * is preserved on `.body` for diagnostics.
 */
export class AlfredpayApiError extends Error {
  override name = "AlfredpayApiError";
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
