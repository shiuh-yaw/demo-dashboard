/**
 * Iron Finance shared types.
 *
 * Mirrors the Iron API contract used by `IronFinanceClient`. Extracted from
 * `apps/dashboard/src/lib/services/iron.ts` (Phase 1B).
 */

export type CustomerType = "individual" | "business";
export type KYCStatus = "not_started" | "pending" | "approved" | "rejected";

// Iron API uses capitalized blockchain names
export type BlockchainType =
  | "Ethereum"
  | "Solana"
  | "Polygon"
  | "Arbitrum"
  | "Base"
  | "Stellar"
  | "Citrea";

export type FiatCurrency = "USD" | "EUR" | "GBP" | "BRL" | "MXN";
export type CryptoCurrency = "USDC" | "USDT" | "USDB" | "EURC";

/** Iron API GET /fiatcurrencies — supported fiat currency with countries */
export interface IronFiatCurrencyCountry {
  code: string; // ISO 3166-1 Alpha-2
}
export interface IronFiatCurrency {
  code: string; // ISO 4217 e.g. EUR
  name: string; // e.g. Euro
  countries: IronFiatCurrencyCountry[];
}

export type PaymentRail = "ach" | "wire" | "sepa" | "pix" | "faster_payments";

export type RampStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

// =============================================================================
// CUSTOMER
// =============================================================================

export interface CreateCustomerRequest {
  type: CustomerType;
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  date_of_birth?: string; // YYYY-MM-DD
  country_code?: string; // ISO 3166-1 alpha-2
  metadata?: Record<string, unknown>;
}

export interface Customer {
  id: string;
  type: CustomerType;
  email: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  country_code?: string;
  kyc_status: KYCStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  phone_number?: string;
  metadata?: Record<string, unknown>;
}

export interface ListCustomersRequest {
  limit?: number;
  offset?: number;
  type?: CustomerType;
  kyc_status?: KYCStatus;
}

// =============================================================================
// WALLET / CRYPTO ADDRESS
// =============================================================================

export interface RegisterSelfHostedAddressRequest {
  customer_id: string;
  blockchain: BlockchainType;
  address: string;
  signature: string;
  message: string;
  label?: string;
}

/** Legacy aliases for backwards compatibility */
export type RegisterHostedWalletRequest = RegisterSelfHostedAddressRequest;
export type RegisterSelfHostedWalletRequest = RegisterSelfHostedAddressRequest;

export interface Wallet {
  id: string;
  customer_id?: string;
  blockchain: BlockchainType;
  wallet_address: string;
  /** Present in list responses for UI compatibility */
  address?: string;
  is_hosted: boolean;
  label?: string;
  created_at: string;
  updated_at: string;
}

/** GET /addresses/crypto/{customer_id} response item */
export interface VerifiedAddressResponse {
  id: string;
  wallet_address: string;
  address_type: "Hosted" | "SelfHosted";
  blockchain: string;
  created_at: string;
  disabled?: boolean;
  proof_message?: string;
  proof_signature?: string;
  vasp_did?: string | null;
}

// =============================================================================
// FIAT ADDRESS / BANK ACCOUNT
// =============================================================================

export interface RecipientAddress {
  street: string;
  city: string;
  state: string;
  country: { code: string };
  postal_code: string;
}

export interface SEPAAccountIdentifier {
  type: "SEPA";
  iban: string;
}

export interface ACHAccountIdentifier {
  type: "ACH";
  routing_number: string;
  account_number: string;
}

export interface WireAccountIdentifier {
  type: "Wire";
  routing_number: string;
  account_number: string;
}

export type BankAccountIdentifier =
  | SEPAAccountIdentifier
  | ACHAccountIdentifier
  | WireAccountIdentifier;

export interface IndividualRecipient {
  type: "Individual";
  given_name: string;
  family_name: string;
}

export interface BusinessRecipient {
  type: "Business";
  name: string;
}

export type RecipientName = IndividualRecipient | BusinessRecipient;

export interface RecipientBankAccount {
  recipient: RecipientName;
  provider_name: string;
  provider_country: { code: string };
  account_identifier: BankAccountIdentifier;
  address: RecipientAddress;
  is_third_party: boolean;
  phone_number?: string;
  email_address?: { email: string };
}

export interface RegisterFiatAddressRequest {
  customer_id: string;
  currency: { code: string };
  bank_details: RecipientBankAccount;
  label?: string;
}

/** Simplified request format for the API route */
export interface SimplifiedBankAccountRequest {
  customer_id: string;
  currency: FiatCurrency;
  account_holder_name: string;
  iban?: string;
  routing_number?: string;
  account_number?: string;
  bank_name: string;
  bank_country: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  label?: string;
  is_third_party?: boolean;
}

export interface FiatAddress {
  id: string;
  customer_id: string;
  currency: string;
  bank_name: string;
  country: string;
  status:
    | "AuthorizationRequired"
    | "AuthorizationFailed"
    | "RegistrationPending"
    | "RegistrationFailed"
    | "Registered";
  ownership_verified: boolean;
  is_third_party: boolean;
  label?: string;
  created_at: string;
  updated_at: string;
  bank_account_identifier?: {
    type?: string;
    iban?: string;
    [k: string]: unknown;
  };
  account_identifier?: { type?: string; iban?: string; [k: string]: unknown };
  iban?: string;
}

/** Legacy aliases */
export type RegisterBankAccountRequest = SimplifiedBankAccountRequest;
export type BankAccount = FiatAddress;

/** Simpler request format used by some API routes (defaults applied) */
export interface SimpleBankAccountRequest {
  customer_id: string;
  currency: FiatCurrency;
  account_holder_name: string;
  account_number?: string;
  routing_number?: string;
  iban?: string;
  swift_code?: string;
  sort_code?: string;
  bank_name?: string;
  bank_address?: string;
  label?: string;
}

/** GET /addresses/fiat/{customer_id} response */
export interface PagedFiatAddresses {
  items: FiatAddress[];
  cursor?: string | null;
  prev_cursor?: string | null;
}

// =============================================================================
// QUOTE
// =============================================================================

export interface OnrampQuoteRequest {
  customer_id: string;
  source_currency: FiatCurrency;
  destination_currency: CryptoCurrency;
  source_amount?: number;
  destination_amount?: number;
  payment_rail: PaymentRail;
  wallet_address: string;
  blockchain?: BlockchainType;
}

export interface OfframpQuoteRequest {
  customer_id: string;
  source_currency: CryptoCurrency;
  destination_currency: FiatCurrency;
  source_amount?: number;
  destination_amount?: number;
  bank_account_id: string;
  blockchain?: BlockchainType;
}

export interface Quote {
  id: string;
  type: "onramp" | "offramp";
  source_currency: string;
  destination_currency: string;
  source_amount: number;
  destination_amount: number;
  exchange_rate: number;
  fees: {
    network_fee?: number;
    service_fee?: number;
    total_fee: number;
  };
  expires_at: string;
  created_at: string;
}

/** Iron API quote response (from /api/autoramps/quote) */
export interface IronQuoteResponse {
  quote_id: string;
  customer_id: string;
  amount_in?: { amount: string; currency: { code: string; type: string } };
  amount_out?: { amount: string; currency: { code: string; type: string } };
  source_currency?: {
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  };
  destination_currency?: {
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  };
  rate: string;
  rate_expiry_policy: string;
  valid_until: string;
  signature: string;
  is_third_party: boolean;
  fee: {
    total_fee?: { amount: string; currency: { code: string; type: string } };
    iron_fee?: { amount: string; currency: { code: string; type: string } };
    network_fee?: { amount: string; currency: { code: string; type: string } };
    banking_fee?: { amount: string; currency: { code: string; type: string } };
  };
}

/** Iron autoramp response (from /api/autoramps) */
export interface IronAutorampResponse {
  id: string;
  kind: "Onramp" | "Offramp" | "Swap";
  status: string;
  created_at: string;
  is_third_party: boolean;
  fee_profile_id?: string;
  deposit_rails?: Array<{
    iban?: string;
    name?: string;
    bic?: string;
    beneficiary_name?: string;
    address?: string;
    phone?: string;
  }>;
  destination_currency?: {
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  };
  source_currencies?: Array<{
    blockchain?: string;
    token?: string;
    code?: string;
    type?: string;
  }>;
  recipient?: {
    customer_id?: string;
    account_identifier?: { iban?: string; type?: string };
    provider_name?: string;
    is_third_party?: boolean;
  };
  quote?: {
    quote_id?: string;
    amount_in?: { amount: string; currency: { code: string; type: string } };
    amount_out?: { amount: string; currency: { code: string; type: string } };
    rate?: string;
    valid_until?: string;
    fee?: {
      total_fee?: { amount: string; currency: { code: string; type: string } };
    };
  };
  external_id?: string;
  name?: string;
}

// =============================================================================
// ONRAMP
// =============================================================================

export interface CreateOnrampRequest {
  quote_id: string;
  customer_id: string;
  wallet_address: string;
  bank_account_id?: string;
  blockchain?: BlockchainType;
  source_currency?: FiatCurrency;
  destination_currency?: CryptoCurrency;
}

export interface Onramp {
  id: string;
  customer_id: string;
  quote_id: string;
  wallet_id: string;
  status: RampStatus;
  source_currency: FiatCurrency;
  destination_currency: CryptoCurrency;
  source_amount: number;
  destination_amount: number;
  transaction_hash?: string;
  payment_instructions?: {
    account_number: string;
    routing_number?: string;
    reference_code: string;
    bank_name?: string;
  };
  estimated_completion_time?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// OFFRAMP
// =============================================================================

export interface CreateOfframpRequest {
  quote_id: string;
  customer_id: string;
  bank_account_id: string;
  blockchain?: BlockchainType;
  source_currency?: CryptoCurrency;
  destination_currency?: FiatCurrency;
}

export interface Offramp {
  id: string;
  customer_id: string;
  quote_id: string;
  wallet_id: string;
  bank_account_id: string;
  status: RampStatus;
  source_currency: CryptoCurrency;
  destination_currency: FiatCurrency;
  source_amount: number;
  destination_amount: number;
  transaction_hash?: string;
  estimated_completion_time?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// THIRD PARTY PAYMENT
// =============================================================================

export interface CreateThirdPartyPaymentRequest {
  customer_id: string;
  type: "payin" | "payout";
  amount: number;
  currency: FiatCurrency;
  bank_account_id: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ThirdPartyPayment {
  id: string;
  customer_id: string;
  type: "payin" | "payout";
  amount: number;
  currency: FiatCurrency;
  status: RampStatus;
  bank_account_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// KYC
// =============================================================================

export interface StartKYCRequest {
  customer_id: string;
  return_url?: string;
}

export interface KYCSession {
  id: string;
  customer_id: string;
  status: KYCStatus;
  verification_url?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SIGNINGS
// =============================================================================

export interface RequiredSigning {
  id: string;
  display_name: string;
  type: "Url" | "Text";
  url?: string;
  text?: string;
}

export interface CreateSigningRequest {
  content_id: string;
  content_type: "Url" | "Text";
  signed: boolean;
}

export interface Signing {
  id: string;
  content_id: string;
  content_type: "Url" | "Text";
  signed: boolean;
  created_at: string;
}

// =============================================================================
// AUTORAMP / VIRTUAL ACCOUNT
// =============================================================================

export interface PagedAutorampsResponse {
  items: IronAutorampResponse[];
  cursor?: string | null;
  prev_cursor?: string | null;
}

export interface VirtualAccount {
  id: string;
  customer_id: string;
  name: string;
  currency: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  destination_wallet_address?: string;
  destination_blockchain?: string;
  destination_currency?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PagedVirtualAccountsResponse {
  items: VirtualAccount[];
  cursor?: string | null;
  prev_cursor?: string | null;
}

// =============================================================================
// SANDBOX
// =============================================================================

export interface UpdateIdentificationStatusRequest {
  approved: boolean;
}

export interface Identification {
  id: string;
  customer_id: string;
  status:
    | "Pending"
    | "Processed"
    | "PendingReview"
    | "Approved"
    | "Declined"
    | "Expired";
  url?: string;
  created_at: string;
  updated_at: string;
}
