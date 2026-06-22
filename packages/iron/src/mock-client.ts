/**
 * MockIronClient — namespace-shaped mock for tests and non-network demos.
 *
 * Mirrors {@link IIronFinanceClient} exactly so a `MockIronClient` is
 * interchangeable with a real `IronFinanceClient` in callers that only need
 * the surface to compile + resolve. Methods return shaped placeholders; they
 * do not exercise real Iron API behavior.
 */

import type {
  AutorampsNamespace,
  BankNamespace,
  CustomersNamespace,
  IIronFinanceClient,
  IdentificationsNamespace,
  KycNamespace,
  MetadataNamespace,
  OfframpNamespace,
  OnrampNamespace,
  QuotesNamespace,
  SandboxNamespace,
  SigningsNamespace,
  ThirdPartyPaymentsNamespace,
  VirtualAccountsNamespace,
  WalletsNamespace,
} from "./types";

export class MockIronClient implements IIronFinanceClient {
  readonly customers: CustomersNamespace = {
    create: async () =>
      ({
        id: "mock-cust-1",
        type: "individual",
        email: "mock@example.com",
        kyc_status: "not_started",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (customerId) =>
      ({
        id: customerId,
        type: "individual",
        email: "mock@example.com",
        kyc_status: "not_started",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [], total: 0 }) as never,
    update: async (customerId) =>
      ({
        id: customerId,
        type: "individual",
        email: "mock@example.com",
        kyc_status: "not_started",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
  };

  readonly kyc: KycNamespace = {
    start: async (request) =>
      ({
        id: "mock-kyc-1",
        customer_id: request.customer_id,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    getSession: async (sessionId) =>
      ({
        id: sessionId,
        customer_id: "mock-cust-1",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    getStatus: async () => ({ status: "pending" }) as never,
    startWithToken: async (request) =>
      ({
        id: "mock-identification-1",
        customer_id: request.customer_id,
        status: "Processed",
        with_edd: !!request.edd_questionnaire,
        url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
  };

  readonly identifications: IdentificationsNamespace = {
    list: async () => [] as never,
    updateStatus: async (identificationId, approved) =>
      ({
        id: identificationId,
        customer_id: "mock-cust-1",
        status: approved ? "Approved" : "Declined",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
  };

  readonly signings: SigningsNamespace = {
    listRequired: async () => [] as never,
    create: async (_customerId, request) =>
      ({
        id: "mock-signing-1",
        content_id: request.content_id,
        content_type: request.content_type,
        signed: request.signed,
        created_at: new Date().toISOString(),
      }) as never,
  };

  readonly wallets: WalletsNamespace = {
    registerHosted: async (request) =>
      ({
        id: "mock-wallet-1",
        customer_id: request.customer_id,
        blockchain: request.blockchain,
        wallet_address: request.address,
        is_hosted: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    registerSelfHosted: async (request) =>
      ({
        id: "mock-wallet-1",
        customer_id: request.customer_id,
        blockchain: request.blockchain,
        wallet_address: request.address,
        is_hosted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (walletId) =>
      ({
        id: walletId,
        blockchain: "Base",
        wallet_address: "0xmock",
        is_hosted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [] }) as never,
  };

  readonly bank: BankNamespace = {
    register: async (request) =>
      ({
        id: "mock-bank-1",
        customer_id: request.customer_id,
        currency: request.currency,
        bank_name: request.bank_name ?? "Mock Bank",
        country: "US",
        status: "Registered",
        ownership_verified: true,
        is_third_party: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (addressId) =>
      ({
        id: addressId,
        customer_id: "mock-cust-1",
        currency: "USD",
        bank_name: "Mock Bank",
        country: "US",
        status: "Registered",
        ownership_verified: true,
        is_third_party: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [] }) as never,
    delete: async () => ({ success: true }),
  };

  readonly onramp: OnrampNamespace = {
    quote: async () =>
      ({
        id: "mock-quote-1",
        type: "onramp",
        source_currency: "EUR",
        destination_currency: "USDC",
        source_amount: 0,
        destination_amount: 0,
        exchange_rate: 1,
        fees: { total_fee: 0 },
        expires_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }) as never,
    create: async () =>
      ({
        id: "mock-onramp-1",
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        status: "pending",
        source_currency: "EUR",
        destination_currency: "USDC",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (onrampId) =>
      ({
        id: onrampId,
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        status: "pending",
        source_currency: "EUR",
        destination_currency: "USDC",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [], total: 0 }) as never,
    cancel: async (onrampId) =>
      ({
        id: onrampId,
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        status: "cancelled",
        source_currency: "EUR",
        destination_currency: "USDC",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
  };

  readonly offramp: OfframpNamespace = {
    quote: async () =>
      ({
        id: "mock-quote-1",
        type: "offramp",
        source_currency: "USDC",
        destination_currency: "EUR",
        source_amount: 0,
        destination_amount: 0,
        exchange_rate: 1,
        fees: { total_fee: 0 },
        expires_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }) as never,
    create: async () =>
      ({
        id: "mock-offramp-1",
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        bank_account_id: "mock-bank-1",
        status: "pending",
        source_currency: "USDC",
        destination_currency: "EUR",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (offrampId) =>
      ({
        id: offrampId,
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        bank_account_id: "mock-bank-1",
        status: "pending",
        source_currency: "USDC",
        destination_currency: "EUR",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [], total: 0 }) as never,
    cancel: async (offrampId) =>
      ({
        id: offrampId,
        customer_id: "mock-cust-1",
        quote_id: "mock-quote-1",
        wallet_id: "",
        bank_account_id: "mock-bank-1",
        status: "cancelled",
        source_currency: "USDC",
        destination_currency: "EUR",
        source_amount: 0,
        destination_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
  };

  readonly quotes: QuotesNamespace = {
    get: async () => {
      throw new Error(
        "Direct quote lookup not supported. Use onramp.quote or offramp.quote instead.",
      );
    },
  };

  readonly thirdPartyPayments: ThirdPartyPaymentsNamespace = {
    create: async (request) =>
      ({
        id: "mock-tpp-1",
        customer_id: request.customer_id,
        type: request.type,
        amount: request.amount,
        currency: request.currency,
        status: "pending",
        bank_account_id: request.bank_account_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    get: async (paymentId) =>
      ({
        id: paymentId,
        customer_id: "mock-cust-1",
        type: "payout",
        amount: 0,
        currency: "USD",
        status: "pending",
        bank_account_id: "mock-bank-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }) as never,
    list: async () => ({ data: [], total: 0 }) as never,
  };

  readonly autoramps: AutorampsNamespace = {
    list: async () => ({ items: [] }) as never,
  };

  readonly virtualAccounts: VirtualAccountsNamespace = {
    list: async () => ({ items: [] }) as never,
    create: async (customerId, request) =>
      ({
        id: "mock-va-1",
        customer_id: customerId,
        name: request.name,
        currency: request.currency,
        status: "active",
        created_at: new Date().toISOString(),
      }) as never,
  };

  readonly metadata: MetadataNamespace = {
    listFiatCurrencies: async () => [],
  };

  readonly sandbox: SandboxNamespace = {
    approveAutoramp: async () => {},
    setAutorampStatus: async () => {},
    approveFiatAddress: async () => {},
    setFiatAddressStatus: async () => {},
    createTransaction: async (request) =>
      ({
        id: "mock-txn-1",
        autoramp_id: request.autoramp_id,
        amount_in: request.amount,
        currency_in: "EUR",
        amount_out: request.amount,
        currency_out: "USDC",
        customer_id: "mock-cust-1",
        state: request.initial_state ?? "Pending",
        created_at: new Date().toISOString(),
      }) as never,
    setTransactionState: async () => {},
    reset: async () => {},
  };
}
