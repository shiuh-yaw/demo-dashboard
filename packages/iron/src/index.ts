/**
 * @dynamic-demos/iron
 *
 * Iron Finance (MoonPay) integration package — onramp, offramp, KYC,
 * customer/wallet/bank management, third-party payments, virtual accounts.
 *
 * Sandbox-by-default per D-005. Use `createIronClient({ apiKey, env })` —
 * the constructor no longer reads `process.env`. The dashboard-side helper
 * `apps/dashboard/src/lib/iron/client.ts` is the only sanctioned env-reader.
 */

// Client + factory
export { IronFinanceClient, createIronClient } from "./client";

// Mock client (test fixtures + non-network demos)
export { MockIronClient } from "./mock-client";

// Environment helpers
export {
  resolveIronBaseUrl,
  resolveIronEnvironment,
  type IronEnvironment,
} from "./env";

// State mapping (canonical TransactionState bridge)
export {
  rampStatusToCanonical,
  ironAutorampStatusToCanonical,
  type CanonicalTransactionState,
} from "./state-mapping";

// Simple offramp helpers (used by apps/proceeds)
export {
  getOfframpQuote,
  createOfframp,
  chainIdToBlockchain,
  type SimpleOfframpBlockchain,
  type SimpleOfframpStatus,
  type SimpleOfframpQuote,
  type SimpleOfframpResult,
  type SimpleOfframpConfig,
} from "./simple-offramp";

// Webhooks (signature verify + canonical normalize)
export {
  verifyIronSignature,
  normalizeIronEvent,
  IRON_SIGNATURE_HEADER,
  type CanonicalEvent,
  type IronWebhookPayload,
} from "./webhooks";

// Types
export type {
  // client config + namespace interfaces
  IronClientConfig,
  IIronFinanceClient,
  CustomersNamespace,
  KycNamespace,
  IdentificationsNamespace,
  SigningsNamespace,
  WalletsNamespace,
  BankNamespace,
  OnrampNamespace,
  OfframpNamespace,
  QuotesNamespace,
  ThirdPartyPaymentsNamespace,
  AutorampsNamespace,
  VirtualAccountsNamespace,
  MetadataNamespace,
  CreateVirtualAccountRequest,
  // base
  CustomerType,
  KYCStatus,
  BlockchainType,
  FiatCurrency,
  CryptoCurrency,
  PaymentRail,
  RampStatus,
  IronFiatCurrency,
  IronFiatCurrencyCountry,
  // customer
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
  ListCustomersRequest,
  // wallet
  RegisterSelfHostedAddressRequest,
  RegisterHostedWalletRequest,
  RegisterSelfHostedWalletRequest,
  Wallet,
  VerifiedAddressResponse,
  // bank
  RecipientAddress,
  SEPAAccountIdentifier,
  ACHAccountIdentifier,
  WireAccountIdentifier,
  BankAccountIdentifier,
  IndividualRecipient,
  BusinessRecipient,
  RecipientName,
  RecipientBankAccount,
  RegisterFiatAddressRequest,
  SimplifiedBankAccountRequest,
  SimpleBankAccountRequest,
  FiatAddress,
  RegisterBankAccountRequest,
  BankAccount,
  PagedFiatAddresses,
  // quote
  OnrampQuoteRequest,
  OfframpQuoteRequest,
  Quote,
  IronQuoteResponse,
  IronAutorampResponse,
  // onramp
  CreateOnrampRequest,
  Onramp,
  // offramp
  CreateOfframpRequest,
  Offramp,
  // third-party payments
  CreateThirdPartyPaymentRequest,
  ThirdPartyPayment,
  // KYC
  StartKYCRequest,
  KYCSession,
  // signings
  RequiredSigning,
  CreateSigningRequest,
  Signing,
  // autoramp / virtual accounts
  PagedAutorampsResponse,
  VirtualAccount,
  PagedVirtualAccountsResponse,
  // sandbox
  UpdateIdentificationStatusRequest,
  Identification,
} from "./types";
