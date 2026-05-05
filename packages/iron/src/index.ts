/**
 * @dynamic-demos/iron
 *
 * Iron Finance (MoonPay) integration package — onramp, offramp, KYC,
 * customer/wallet/bank management, third-party payments, virtual accounts.
 *
 * Sandbox-by-default per D-005. Use `createIronClient` for new code; the
 * exported `ironClient` singleton is a convenience that reads
 * `IRON_API_KEY` / `IRON_ENVIRONMENT` from `process.env`.
 */

// Client + factory
export {
  IronFinanceClient,
  createIronClient,
  ironClient,
  type IronClientOptions,
} from "./client";

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
