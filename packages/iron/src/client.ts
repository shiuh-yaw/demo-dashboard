/**
 * Iron Finance API client.
 *
 * Wraps Iron Finance REST endpoints used by the dashboard. Sandbox-by-default
 * per D-005. Pass `env: 'sandbox' | 'production'` and an `apiKey` to construct
 * a client; `createIronClient` is the factory the dashboard uses.
 *
 * Reference: https://docs.iron.xyz
 * GitHub: https://github.com/ironxyz/mcp-server
 */

import { randomUUID } from "node:crypto";
import {
  resolveIronBaseUrl,
  resolveIronEnvironment,
  type IronEnvironment,
} from "./env";
import type {
  BankAccount,
  BankAccountIdentifier,
  BlockchainType,
  CreateCustomerRequest,
  CreateOfframpRequest,
  CreateOnrampRequest,
  CreateSigningRequest,
  CreateThirdPartyPaymentRequest,
  CryptoCurrency,
  Customer,
  FiatAddress,
  FiatCurrency,
  Identification,
  IronAutorampResponse,
  IronFiatCurrency,
  IronQuoteResponse,
  KYCSession,
  ListCustomersRequest,
  Offramp,
  OfframpQuoteRequest,
  Onramp,
  OnrampQuoteRequest,
  PagedAutorampsResponse,
  PagedFiatAddresses,
  PagedVirtualAccountsResponse,
  Quote,
  RampStatus,
  RegisterFiatAddressRequest,
  RegisterSelfHostedAddressRequest,
  RequiredSigning,
  SimpleBankAccountRequest,
  SimplifiedBankAccountRequest,
  Signing,
  StartKYCRequest,
  ThirdPartyPayment,
  UpdateCustomerRequest,
  VerifiedAddressResponse,
  VirtualAccount,
  Wallet,
  KYCStatus,
} from "./types";

export interface IronClientOptions {
  /** Sandbox or production. Defaults to sandbox (D-005). */
  env?: IronEnvironment;
  /** Iron API key. Falls back to `process.env.IRON_API_KEY` if omitted. */
  apiKey?: string;
  /** Override the base URL (test fixtures). */
  baseUrl?: string;
  /** Override the global `fetch` (test fixtures). */
  fetchImpl?: typeof fetch;
}

export class IronFinanceClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly environment: IronEnvironment;
  private readonly fetchImpl: typeof fetch;

  constructor(options: IronClientOptions = {}) {
    this.environment = resolveIronEnvironment(options.env);
    this.apiKey = options.apiKey ?? process.env.IRON_API_KEY ?? "";
    this.apiUrl = options.baseUrl ?? resolveIronBaseUrl(this.environment);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

    if (!this.apiKey) {
      console.warn(
        "Iron Finance API key not configured. IRON_API_KEY is required.",
      );
    }
  }

  private getHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json; charset=utf-8",
      "X-API-Key": this.apiKey,
    };
    if (idempotencyKey) headers["IDEMPOTENCY-KEY"] = idempotencyKey;
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Iron Finance API error: ${response.status} - ${errorText}`,
      );
    }
    return response.json() as Promise<T>;
  }

  // ===========================================================================
  // CUSTOMER
  // ===========================================================================

  async createCustomer(
    request: CreateCustomerRequest,
    idempotencyKey?: string,
  ): Promise<Customer> {
    const name =
      request.business_name ||
      `${request.first_name || ""} ${request.last_name || ""}`.trim();

    const ironRequest = {
      customer_type: request.type === "individual" ? "Person" : "Business",
      email: request.email,
      name: name || request.email.split("@")[0],
      external_id: request.metadata?.external_id as string | undefined,
    };

    const response = await this.fetchImpl(`${this.apiUrl}/api/customers`, {
      method: "POST",
      headers: this.getHeaders(idempotencyKey || randomUUID()),
      body: JSON.stringify(ironRequest),
    });

    return this.handleResponse<Customer>(response);
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<Customer>(response);
  }

  async listCustomers(
    request?: ListCustomersRequest,
  ): Promise<{ data: Customer[]; total: number }> {
    const params = new URLSearchParams();
    if (request?.limit) params.append("limit", request.limit.toString());
    if (request?.offset) params.append("offset", request.offset.toString());
    if (request?.type) params.append("type", request.type);
    if (request?.kyc_status) params.append("kyc_status", request.kyc_status);

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<{ data: Customer[]; total: number }>(response);
  }

  async updateCustomer(
    customerId: string,
    request: UpdateCustomerRequest,
  ): Promise<Customer> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      },
    );
    return this.handleResponse<Customer>(response);
  }

  // ===========================================================================
  // CURRENCIES
  // ===========================================================================

  async listFiatCurrencies(): Promise<IronFiatCurrency[]> {
    const response = await this.fetchImpl(`${this.apiUrl}/api/fiatcurrencies`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<IronFiatCurrency[]>(response);
  }

  // ===========================================================================
  // WALLETS
  // ===========================================================================

  async registerHostedWallet(
    request: RegisterSelfHostedAddressRequest,
    idempotencyKey?: string,
  ): Promise<Wallet> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/addresses/crypto/selfhosted`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify({
          customer_id: request.customer_id,
          blockchain: request.blockchain,
          address: request.address,
          signature: request.signature,
          message: request.message,
        }),
      },
    );
    return this.handleResponse<Wallet>(response);
  }

  /** @deprecated Use `registerHostedWallet`. */
  async registerSelfHostedWallet(
    request: RegisterSelfHostedAddressRequest,
    idempotencyKey?: string,
  ): Promise<Wallet> {
    return this.registerHostedWallet(request, idempotencyKey);
  }

  async getWallet(walletId: string): Promise<Wallet> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/wallets/${walletId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<Wallet>(response);
  }

  async listWallets(customerId: string): Promise<{ data: Wallet[] }> {
    const url = `${this.apiUrl}/api/addresses/crypto/${customerId}?filter=All`;
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (response.status === 404) return { data: [] };
    const raw = await this.handleResponse<VerifiedAddressResponse[]>(response);
    const data = (Array.isArray(raw) ? raw : []).map((a) => ({
      id: a.id,
      customer_id: customerId,
      blockchain: a.blockchain as BlockchainType,
      wallet_address: a.wallet_address,
      address: a.wallet_address,
      is_hosted: a.address_type === "Hosted",
      created_at: a.created_at,
      updated_at: a.created_at,
    }));
    return { data };
  }

  // ===========================================================================
  // BANK ACCOUNTS
  // ===========================================================================

  async registerBankAccount(
    request: SimplifiedBankAccountRequest | SimpleBankAccountRequest,
    idempotencyKey?: string,
  ): Promise<FiatAddress> {
    const req: SimplifiedBankAccountRequest =
      "bank_country" in request && request.bank_country
        ? (request as SimplifiedBankAccountRequest)
        : {
            customer_id: request.customer_id,
            currency: request.currency,
            account_holder_name: request.account_holder_name,
            iban: request.iban,
            routing_number: request.routing_number,
            account_number: request.account_number,
            bank_name: request.bank_name ?? "Unknown",
            bank_country: "US",
            street: "N/A",
            city: "N/A",
            state: "N/A",
            country: "US",
            postal_code: "00000",
            label: request.label,
          };

    const nameParts = req.account_holder_name.trim().split(/\s+/);
    const givenName = nameParts[0] || "";
    const familyName = nameParts.slice(1).join(" ") || nameParts[0] || "";

    let accountIdentifier: BankAccountIdentifier;
    if (req.iban) {
      accountIdentifier = { type: "SEPA", iban: req.iban };
    } else if (req.routing_number && req.account_number) {
      accountIdentifier = {
        type: "ACH",
        routing_number: req.routing_number,
        account_number: req.account_number,
      };
    } else {
      throw new Error(
        "Either IBAN (for SEPA) or routing_number + account_number (for ACH/Wire) is required",
      );
    }

    const ironRequest: RegisterFiatAddressRequest = {
      customer_id: req.customer_id,
      currency: { code: req.currency },
      bank_details: {
        recipient: {
          type: "Individual",
          given_name: givenName,
          family_name: familyName,
        },
        provider_name: req.bank_name,
        provider_country: { code: req.bank_country },
        account_identifier: accountIdentifier,
        address: {
          street: req.street,
          city: req.city,
          state: req.state,
          country: { code: req.country },
          postal_code: req.postal_code,
        },
        is_third_party: req.is_third_party ?? false,
      },
      label: req.label,
    };

    const response = await this.fetchImpl(`${this.apiUrl}/api/addresses/fiat`, {
      method: "POST",
      headers: this.getHeaders(idempotencyKey || randomUUID()),
      body: JSON.stringify(ironRequest),
    });

    return this.handleResponse<FiatAddress>(response);
  }

  async getBankAccount(addressId: string): Promise<BankAccount> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/addresses/fiat/${addressId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<BankAccount>(response);
  }

  async listBankAccounts(
    customerId: string,
  ): Promise<{ data: BankAccount[] }> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/addresses/fiat/${customerId}`,
      { method: "GET", headers: this.getHeaders() },
    );

    if (response.status === 404) return { data: [] };
    const body = await this.handleResponse<PagedFiatAddresses>(response);
    const items = body?.items ?? [];
    const data = items.map((item) => ({
      ...item,
      account_identifier: item.bank_account_identifier,
      iban:
        item.bank_account_identifier && "iban" in item.bank_account_identifier
          ? item.bank_account_identifier.iban
          : undefined,
    }));
    return { data };
  }

  async deleteBankAccount(addressId: string): Promise<{ success: boolean }> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/addresses/fiat/${addressId}`,
      { method: "DELETE", headers: this.getHeaders() },
    );
    return this.handleResponse<{ success: boolean }>(response);
  }

  // ===========================================================================
  // QUOTES (via Autoramp API)
  // ===========================================================================

  async getOnrampQuote(request: OnrampQuoteRequest): Promise<Quote> {
    const params = new URLSearchParams({
      customer_id: request.customer_id,
      source_currency_code: request.source_currency,
      destination_currency_code: request.destination_currency,
      destination_currency_chain: request.blockchain || "Base",
      recipient_account: request.wallet_address,
      rate_expiry_policy: "Return",
      expiry_in_hours: "24",
      is_third_party: "false",
    });

    if (request.source_amount) {
      params.set("amount_in", (request.source_amount / 100).toString());
    } else if (request.destination_amount) {
      params.set(
        "amount_out",
        (request.destination_amount / 1000000).toString(),
      );
    }

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/quote?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronQuoteResponse>(response);
    return this.mapIronQuoteToQuote(data, "onramp");
  }

  async getOfframpQuote(request: OfframpQuoteRequest): Promise<Quote> {
    const params = new URLSearchParams({
      customer_id: request.customer_id,
      source_currency_code: request.source_currency,
      source_currency_chain: request.blockchain || "Base",
      destination_currency_code: request.destination_currency,
      recipient_account: request.bank_account_id,
      rate_expiry_policy: "Return",
      expiry_in_hours: "24",
      is_third_party: "false",
    });

    if (request.source_amount) {
      params.set("amount_in", (request.source_amount / 1000000).toString());
    } else if (request.destination_amount) {
      params.set("amount_out", (request.destination_amount / 100).toString());
    }

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/quote?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronQuoteResponse>(response);
    return this.mapIronQuoteToQuote(data, "offramp");
  }

  private mapIronQuoteToQuote(
    data: IronQuoteResponse,
    type: "onramp" | "offramp",
  ): Quote {
    return {
      id: data.quote_id,
      type,
      source_currency:
        data.source_currency?.token || data.amount_in?.currency?.code || "",
      destination_currency:
        data.destination_currency?.token ||
        data.amount_out?.currency?.code ||
        "",
      source_amount:
        parseFloat(data.amount_in?.amount || "0") *
        (type === "onramp" ? 100 : 1000000),
      destination_amount:
        parseFloat(data.amount_out?.amount || "0") *
        (type === "onramp" ? 1000000 : 100),
      exchange_rate: parseFloat(data.rate || "1"),
      fees: {
        network_fee: parseFloat(data.fee?.network_fee?.amount || "0") * 100,
        service_fee: parseFloat(data.fee?.iron_fee?.amount || "0") * 100,
        total_fee: parseFloat(data.fee?.total_fee?.amount || "0") * 100,
      },
      expires_at: data.valid_until,
      created_at: new Date().toISOString(),
    };
  }

  /** Iron has no quote-by-ID endpoint; quotes are ephemeral. */
  async getQuote(quoteId: string): Promise<Quote> {
    console.log("quoteId", quoteId);
    throw new Error(
      "Direct quote lookup not supported. Use getOnrampQuote or getOfframpQuote instead.",
    );
  }

  // ===========================================================================
  // AUTORAMP — onramp
  // ===========================================================================

  async createOnramp(
    request: CreateOnrampRequest,
    idempotencyKey?: string,
  ): Promise<Onramp> {
    const blockchain = request.blockchain || "Base";
    const destinationCurrency = request.destination_currency || "USDC";
    const sourceCurrency = request.source_currency || "EUR";

    const autorampRequest = {
      customer_id: request.customer_id,
      destination_currency: {
        type: "Crypto",
        blockchain,
        token: destinationCurrency,
      },
      recipient_account: {
        type: "Crypto",
        chain: blockchain,
        address: request.wallet_address,
      },
      source_currencies: [{ type: "Fiat", code: sourceCurrency }],
    };

    const response = await this.fetchImpl(`${this.apiUrl}/api/autoramps`, {
      method: "POST",
      headers: this.getHeaders(idempotencyKey || randomUUID()),
      body: JSON.stringify(autorampRequest),
    });
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOnramp(data);
  }

  private mapAutorampToOnramp(data: IronAutorampResponse): Onramp {
    return {
      id: data.id,
      customer_id: data.recipient?.customer_id || "",
      quote_id: data.quote?.quote_id || "",
      wallet_id: "",
      status: this.mapAutorampStatus(data.status),
      source_currency: "EUR" as FiatCurrency,
      destination_currency: "USDC" as CryptoCurrency,
      source_amount: parseFloat(data.quote?.amount_in?.amount || "0") * 100,
      destination_amount:
        parseFloat(data.quote?.amount_out?.amount || "0") * 1000000,
      payment_instructions: data.deposit_rails?.[0]
        ? {
            account_number: data.deposit_rails[0].iban || "",
            reference_code: data.id,
            bank_name: data.deposit_rails[0].name || "Iron Bank",
          }
        : undefined,
      created_at: data.created_at,
      updated_at: data.created_at,
    };
  }

  private mapAutorampStatus(status: string): RampStatus {
    const statusMap: Record<string, RampStatus> = {
      Created: "pending",
      EditPending: "pending",
      Authorized: "processing",
      DepositAccountAdded: "processing",
      Approved: "completed",
      Rejected: "failed",
      Cancelled: "cancelled",
    };
    return statusMap[status] || "pending";
  }

  async getOnramp(onrampId: string): Promise<Onramp> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/${onrampId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOnramp(data);
  }

  async listOnramps(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: Onramp[]; total: number }> {
    const params = new URLSearchParams({ customer_id: customerId });
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const result = await this.handleResponse<{
      data: IronAutorampResponse[];
    }>(response);
    return {
      data: result.data
        .filter((a) => a.kind === "Onramp")
        .map((a) => this.mapAutorampToOnramp(a)),
      total: result.data.filter((a) => a.kind === "Onramp").length,
    };
  }

  async cancelOnramp(onrampId: string): Promise<Onramp> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/${onrampId}`,
      { method: "DELETE", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOnramp(data);
  }

  // ===========================================================================
  // AUTORAMP — offramp
  // ===========================================================================

  async createOfframp(
    request: CreateOfframpRequest,
    idempotencyKey?: string,
  ): Promise<Offramp> {
    const blockchain = request.blockchain || "Base";
    const sourceCurrency = request.source_currency || "USDC";
    const destinationCurrency = request.destination_currency || "EUR";

    const autorampRequest = {
      customer_id: request.customer_id,
      destination_currency: { type: "Fiat", code: destinationCurrency },
      recipient_account: {
        type: "Fiat",
        account_identifier: { type: "SEPA", iban: request.bank_account_id },
      },
      source_currencies: [
        { type: "Crypto", blockchain, token: sourceCurrency },
      ],
    };

    const response = await this.fetchImpl(`${this.apiUrl}/api/autoramps`, {
      method: "POST",
      headers: this.getHeaders(idempotencyKey || randomUUID()),
      body: JSON.stringify(autorampRequest),
    });
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOfframp(data);
  }

  private mapAutorampToOfframp(data: IronAutorampResponse): Offramp {
    return {
      id: data.id,
      customer_id: data.recipient?.customer_id || "",
      quote_id: data.quote?.quote_id || "",
      wallet_id: "",
      bank_account_id: data.recipient?.account_identifier?.iban || "",
      status: this.mapAutorampStatus(data.status),
      source_currency: "USDC" as CryptoCurrency,
      destination_currency: "EUR" as FiatCurrency,
      source_amount: parseFloat(data.quote?.amount_in?.amount || "0") * 1000000,
      destination_amount:
        parseFloat(data.quote?.amount_out?.amount || "0") * 100,
      created_at: data.created_at,
      updated_at: data.created_at,
    };
  }

  async getOfframp(offrampId: string): Promise<Offramp> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/${offrampId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOfframp(data);
  }

  async listOfframps(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: Offramp[]; total: number }> {
    const params = new URLSearchParams({ customer_id: customerId });
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    const result = await this.handleResponse<{
      data: IronAutorampResponse[];
    }>(response);
    return {
      data: result.data
        .filter((a) => a.kind === "Offramp")
        .map((a) => this.mapAutorampToOfframp(a)),
      total: result.data.filter((a) => a.kind === "Offramp").length,
    };
  }

  async cancelOfframp(offrampId: string): Promise<Offramp> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps/${offrampId}`,
      { method: "DELETE", headers: this.getHeaders() },
    );
    const data = await this.handleResponse<IronAutorampResponse>(response);
    return this.mapAutorampToOfframp(data);
  }

  // ===========================================================================
  // THIRD PARTY PAYMENTS
  // ===========================================================================

  async createThirdPartyPayment(
    request: CreateThirdPartyPaymentRequest,
    idempotencyKey?: string,
  ): Promise<ThirdPartyPayment> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/third-party-payments`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify(request),
      },
    );
    return this.handleResponse<ThirdPartyPayment>(response);
  }

  async getThirdPartyPayment(paymentId: string): Promise<ThirdPartyPayment> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/third-party-payments/${paymentId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<ThirdPartyPayment>(response);
  }

  async listThirdPartyPayments(
    customerId: string,
    limit?: number,
    offset?: number,
  ): Promise<{ data: ThirdPartyPayment[]; total: number }> {
    const params = new URLSearchParams({ customer_id: customerId });
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const response = await this.fetchImpl(
      `${this.apiUrl}/api/third-party-payments?${params.toString()}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<{
      data: ThirdPartyPayment[];
      total: number;
    }>(response);
  }

  // ===========================================================================
  // KYC
  // ===========================================================================

  async startKYC(
    request: StartKYCRequest,
    idempotencyKey?: string,
  ): Promise<KYCSession> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${request.customer_id}/identifications/v2`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify({ type: "Link" }),
      },
    );
    return this.handleResponse<KYCSession>(response);
  }

  async getKYCSession(sessionId: string): Promise<KYCSession> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/kyc/sessions/${sessionId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<KYCSession>(response);
  }

  async getCustomerKYCStatus(customerId: string): Promise<{
    status: KYCStatus;
    session?: KYCSession;
  }> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/kyc-status`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<{ status: KYCStatus; session?: KYCSession }>(
      response,
    );
  }

  // ===========================================================================
  // SIGNINGS
  // ===========================================================================

  async getRequiredSignings(customerId: string): Promise<RequiredSigning[]> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/required-signings`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<RequiredSigning[]>(response);
  }

  async createSigning(
    customerId: string,
    request: CreateSigningRequest,
    idempotencyKey?: string,
  ): Promise<Signing> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/signings`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify(request),
      },
    );
    return this.handleResponse<Signing>(response);
  }

  // ===========================================================================
  // SANDBOX
  // ===========================================================================

  async getCustomerIdentifications(
    customerId: string,
  ): Promise<Identification[]> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/identifications`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<Identification[]>(response);
  }

  async updateIdentificationStatus(
    identificationId: string,
    approved: boolean,
    idempotencyKey?: string,
  ): Promise<Identification> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/sandbox/identification/${identificationId}`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify({ approved }),
      },
    );
    return this.handleResponse<Identification>(response);
  }

  isSandbox(): boolean {
    return this.environment === "sandbox";
  }

  // ===========================================================================
  // AUTORAMPS / VIRTUAL ACCOUNTS
  // ===========================================================================

  async listAutoramps(customerId: string): Promise<PagedAutorampsResponse> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/autoramps?customer_id=${customerId}`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<PagedAutorampsResponse>(response);
  }

  async listVirtualAccounts(
    customerId: string,
  ): Promise<PagedVirtualAccountsResponse> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/virtual-accounts`,
      { method: "GET", headers: this.getHeaders() },
    );
    return this.handleResponse<PagedVirtualAccountsResponse>(response);
  }

  async createVirtualAccount(
    customerId: string,
    request: {
      name: string;
      currency: FiatCurrency;
      destination_wallet_address?: string;
      destination_blockchain?: BlockchainType;
      destination_currency?: CryptoCurrency;
    },
    idempotencyKey?: string,
  ): Promise<VirtualAccount> {
    const response = await this.fetchImpl(
      `${this.apiUrl}/api/customers/${customerId}/virtual-accounts`,
      {
        method: "POST",
        headers: this.getHeaders(idempotencyKey || randomUUID()),
        body: JSON.stringify(request),
      },
    );
    return this.handleResponse<VirtualAccount>(response);
  }
}

/**
 * Factory for an `IronFinanceClient`. Sandbox-by-default per D-005.
 */
export function createIronClient(
  options: IronClientOptions = {},
): IronFinanceClient {
  return new IronFinanceClient(options);
}

/**
 * Pre-configured singleton — reads `IRON_API_KEY` and `IRON_ENVIRONMENT` from
 * the environment. Prefer `createIronClient` in tests + new code.
 */
export const ironClient = new IronFinanceClient();
