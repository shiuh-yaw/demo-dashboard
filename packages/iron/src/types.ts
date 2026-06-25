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
  /** Recipient email — required by Iron for USD (ACH) accounts. */
  email?: string;
  /** Recipient phone (E.164) — required by Iron for USD (ACH) accounts. */
  phone?: string;
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
  /** Recipient email — required by Iron for USD (ACH) accounts. */
  email?: string;
  /** Recipient phone (E.164) — required by Iron for USD (ACH) accounts. */
  phone?: string;
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
  /**
   * Recipient bank account. For SEPA (EUR) this is the IBAN, sent as
   * `recipient_account`. For ACH (USD) Iron rejects `recipient_account` and
   * requires the registered fiat-address id via `recipient_account_id` — pass
   * that id in `recipient_account_id` below instead.
   */
  bank_account_id: string;
  /**
   * Registered fiat-address id, sent as `recipient_account_id`. Required by
   * Iron for USD (ACH) offramp quotes; takes precedence over `bank_account_id`.
   */
  recipient_account_id?: string;
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
  /**
   * ACH (USD) recipient details. When both are present the offramp recipient is
   * built as an inline ACH account_identifier instead of SEPA/IBAN. `bank_account_id`
   * is then unused for the recipient identifier.
   */
  routing_number?: string;
  account_number?: string;
  /**
   * Optional partner-supplied identifier persisted on the autoramp and echoed
   * back by Iron (e.g. in `autoramps.list`). The autoramp resource itself does
   * not return converted amounts, so callers can stash a small encoded value
   * here to recover demo display data without a separate store.
   */
  external_id?: string;
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

export type KycIdentificationType = "Link" | "Token";

export type IntendedUse =
  | "Investing"
  | "PaymentToFriendsFamilyorOthers"
  | "PurchaseDigitalAssets"
  | "OnlinePurchasesOfGoodsOrServices"
  | "Trading";

export type EmploymentStatus =
  | "Employed"
  | "SelfEmployed"
  | "Unemployed"
  | "Retired"
  | "Student";

export type SourceOfWealth =
  | "Salary"
  | "Savings"
  | "Investments"
  | "CryptoTrading"
  | "Other";

export type ExpectedMonthlyTxCount =
  | "LessThan5"
  | "Between5And10"
  | "MoreThan10";

export type ExpectedMonthlyTxVolume =
  | "LessThan500"
  | "MoreThan500LessThan2000"
  | "MoreThan2000";

export interface KycQuestionnaire {
  employment_status: EmploymentStatus;
  yearly_gross_income: string;
  source_of_wealth: SourceOfWealth;
  expected_monthly_transaction_count: ExpectedMonthlyTxCount;
  expected_monthly_transaction_volume: ExpectedMonthlyTxVolume;
}

export interface EddQuestionnaire {
  occupation: string;
  approximate_net_worth: string;
  source_of_funds_proof?: string;
}

export interface StartKYCTokenRequest {
  customer_id: string;
  /** SumSub share token (single-use, invalidated after consumption). */
  token: string;
  intended_use: IntendedUse;
  ip_address?: string;
  kyc_questionnaire?: KycQuestionnaire;
  edd_questionnaire?: EddQuestionnaire;
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
  with_edd?: boolean | null;
  url?: string | null;
  created_at: string;
  updated_at: string;
}

export type AutorampSandboxStatus =
  | "Created"
  | "EditPending"
  | "Authorized"
  | "DepositAccountAdded"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export type FiatAddressSandboxStatus =
  | "RegistrationPending"
  | "Registered"
  | "RegistrationFailed"
  | "AuthorizationRequired"
  | "AuthorizationFailed";

export type TransactionSandboxState = "Pending" | "Completed" | "Failed";

export interface CreateSandboxTransactionRequest {
  autoramp_id: string;
  /** Deposit amount in the autoramp's input currency (decimal string). */
  amount: string;
  amount_out?: string;
  fee?: string;
  fx_rate?: string;
  initial_state?: TransactionSandboxState;
  input_currency?:
    | { type: "Fiat"; code: string }
    | { type: "Crypto"; blockchain: string; token: string };
  transaction_id?: string;
  deposit_id?: string;
}

export interface SandboxTransaction {
  id: string;
  autoramp_id: string;
  amount_in: string;
  currency_in: string;
  amount_out: string;
  currency_out: string;
  customer_id: string;
  state: TransactionSandboxState;
  created_at: string;
}

// =============================================================================
// VIRTUAL ACCOUNT REQUEST
// =============================================================================

export interface CreateVirtualAccountRequest {
  name: string;
  currency: FiatCurrency;
  destination_wallet_address?: string;
  destination_blockchain?: BlockchainType;
  destination_currency?: CryptoCurrency;
}

// =============================================================================
// CLIENT CONFIG + NAMESPACE INTERFACES
// =============================================================================

/**
 * Client configuration for {@link IronFinanceClient}. `apiKey` is required —
 * the constructor no longer falls back to `process.env`. Pass `env` to pick
 * sandbox (default per D-005) or production; `baseUrl` overrides for tests.
 */
export interface IronClientConfig {
  apiKey: string;
  baseUrl?: string;
  env?: "sandbox" | "production";
  /** Override the global `fetch` (test fixtures). */
  fetchImpl?: typeof fetch;
}

export interface CustomersNamespace {
  create(
    request: CreateCustomerRequest,
    idempotencyKey?: string,
  ): Promise<Customer>;
  get(customerId: string): Promise<Customer>;
  list(
    request?: ListCustomersRequest,
  ): Promise<{ data: Customer[]; total: number }>;
  update(
    customerId: string,
    request: UpdateCustomerRequest,
  ): Promise<Customer>;
}

export interface KycNamespace {
  start(request: StartKYCRequest, idempotencyKey?: string): Promise<KYCSession>;
  /** Submit a SumSub token sharing identification (skips hosted KYC). */
  startWithToken(
    request: StartKYCTokenRequest,
    idempotencyKey?: string,
  ): Promise<Identification>;
  getSession(sessionId: string): Promise<KYCSession>;
  getStatus(
    customerId: string,
  ): Promise<{ status: KYCStatus; session?: KYCSession }>;
}

export interface IdentificationsNamespace {
  list(customerId: string): Promise<Identification[]>;
  updateStatus(
    identificationId: string,
    approved: boolean,
    idempotencyKey?: string,
  ): Promise<Identification>;
}

export interface SigningsNamespace {
  listRequired(customerId: string): Promise<RequiredSigning[]>;
  create(
    customerId: string,
    request: CreateSigningRequest,
    idempotencyKey?: string,
  ): Promise<Signing>;
}

export interface WalletsNamespace {
  registerHosted(
    request: RegisterSelfHostedAddressRequest,
    idempotencyKey?: string,
  ): Promise<Wallet>;
  registerSelfHosted(
    request: RegisterSelfHostedAddressRequest,
    idempotencyKey?: string,
  ): Promise<Wallet>;
  get(walletId: string): Promise<Wallet>;
  list(customerId: string): Promise<{ data: Wallet[] }>;
}

export interface BankNamespace {
  register(
    request: SimplifiedBankAccountRequest | SimpleBankAccountRequest,
    idempotencyKey?: string,
  ): Promise<FiatAddress>;
  get(addressId: string): Promise<BankAccount>;
  list(customerId: string): Promise<{ data: BankAccount[] }>;
  delete(addressId: string): Promise<{ success: boolean }>;
}

export interface OnrampNamespace {
  quote(request: OnrampQuoteRequest): Promise<Quote>;
  create(
    request: CreateOnrampRequest,
    idempotencyKey?: string,
  ): Promise<Onramp>;
  get(onrampId: string): Promise<Onramp>;
  list(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: Onramp[]; total: number }>;
  cancel(onrampId: string): Promise<Onramp>;
}

export interface OfframpNamespace {
  quote(request: OfframpQuoteRequest): Promise<Quote>;
  create(
    request: CreateOfframpRequest,
    idempotencyKey?: string,
  ): Promise<Offramp>;
  get(offrampId: string): Promise<Offramp>;
  list(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: Offramp[]; total: number }>;
  cancel(offrampId: string): Promise<Offramp>;
}

export interface QuotesNamespace {
  get(quoteId: string): Promise<Quote>;
}

export interface ThirdPartyPaymentsNamespace {
  create(
    request: CreateThirdPartyPaymentRequest,
    idempotencyKey?: string,
  ): Promise<ThirdPartyPayment>;
  get(paymentId: string): Promise<ThirdPartyPayment>;
  list(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: ThirdPartyPayment[]; total: number }>;
}

export interface AutorampsNamespace {
  list(customerId: string): Promise<PagedAutorampsResponse>;
}

export interface VirtualAccountsNamespace {
  list(customerId: string): Promise<PagedVirtualAccountsResponse>;
  create(
    customerId: string,
    request: CreateVirtualAccountRequest,
    idempotencyKey?: string,
  ): Promise<VirtualAccount>;
}

export interface MetadataNamespace {
  listFiatCurrencies(): Promise<IronFiatCurrency[]>;
}

export interface SandboxNamespace {
  /** Approve an autoramp (shorthand for setAutorampStatus with "Approved"). */
  approveAutoramp(autorampId: string): Promise<void>;
  /** Set an autoramp to any sandbox status. */
  setAutorampStatus(
    autorampId: string,
    status: AutorampSandboxStatus,
  ): Promise<void>;
  /** Approve a fiat address (shorthand for setFiatAddressStatus with "Registered"). */
  approveFiatAddress(fiatAddressId: string): Promise<void>;
  /** Set a fiat address to any sandbox status. */
  setFiatAddressStatus(
    fiatAddressId: string,
    status: FiatAddressSandboxStatus,
  ): Promise<void>;
  /** Create a mock transaction against an autoramp. */
  createTransaction(
    request: CreateSandboxTransactionRequest,
    idempotencyKey?: string,
  ): Promise<SandboxTransaction>;
  /** Transition a sandbox transaction to a different state. */
  setTransactionState(
    transactionId: string,
    state: TransactionSandboxState,
    idempotencyKey?: string,
  ): Promise<void>;
  /** Reset the sandbox — deletes all customers, wallets, fiat accounts, transactions, and autoramps. */
  reset(idempotencyKey?: string): Promise<void>;
}

export interface IIronFinanceClient {
  readonly customers: CustomersNamespace;
  readonly kyc: KycNamespace;
  readonly identifications: IdentificationsNamespace;
  readonly signings: SigningsNamespace;
  readonly wallets: WalletsNamespace;
  readonly bank: BankNamespace;
  readonly onramp: OnrampNamespace;
  readonly offramp: OfframpNamespace;
  readonly quotes: QuotesNamespace;
  readonly thirdPartyPayments: ThirdPartyPaymentsNamespace;
  readonly autoramps: AutorampsNamespace;
  readonly virtualAccounts: VirtualAccountsNamespace;
  readonly metadata: MetadataNamespace;
  readonly sandbox: SandboxNamespace;
}
