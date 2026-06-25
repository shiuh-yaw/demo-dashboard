/**
 * Iron Finance API client.
 *
 * Wraps Iron Finance REST endpoints used by the dashboard. Sandbox-by-default
 * per D-005. Pass `env: 'sandbox' | 'production'` and an explicit `apiKey` to
 * construct a client; `createIronClient` is the factory the dashboard uses.
 *
 * The public surface is namespaced — `iron.customers.*`, `iron.kyc.*`,
 * `iron.identifications.*`, `iron.signings.*`, `iron.wallets.*`, `iron.bank.*`,
 * `iron.onramp.*`, `iron.offramp.*`, `iron.quotes.*`,
 * `iron.thirdPartyPayments.*`, `iron.autoramps.*`, `iron.virtualAccounts.*`,
 * `iron.metadata.*`. The actual fetch call bodies are unchanged from the
 * previous flat client; this file only reorganizes them.
 *
 * Reference: https://docs.iron.xyz
 * GitHub: https://github.com/ironxyz/mcp-server
 */

import { randomUUID } from "node:crypto";
import { resolveIronBaseUrl, type IronEnvironment } from "./env";
import type {
  AutorampsNamespace,
  BankAccount,
  BankAccountIdentifier,
  BankNamespace,
  BlockchainType,
  CreateOfframpRequest,
  CreateOnrampRequest,
  CreateSandboxTransactionRequest,
  CryptoCurrency,
  CustomersNamespace,
  FiatAddress,
  FiatCurrency,
  IIronFinanceClient,
  Identification,
  IdentificationsNamespace,
  IronAutorampResponse,
  IronClientConfig,
  IronQuoteResponse,
  KYCSession,
  KYCStatus,
  KycNamespace,
  MetadataNamespace,
  Offramp,
  OfframpNamespace,
  OfframpQuoteRequest,
  Onramp,
  OnrampNamespace,
  OnrampQuoteRequest,
  PagedAutorampsResponse,
  PagedFiatAddresses,
  PagedVirtualAccountsResponse,
  Quote,
  QuotesNamespace,
  RampStatus,
  RegisterFiatAddressRequest,
  SandboxNamespace,
  SandboxTransaction,
  SigningsNamespace,
  SimpleBankAccountRequest,
  SimplifiedBankAccountRequest,
  StartKYCTokenRequest,
  ThirdPartyPayment,
  ThirdPartyPaymentsNamespace,
  VerifiedAddressResponse,
  VirtualAccount,
  VirtualAccountsNamespace,
  Wallet,
  WalletsNamespace,
} from "./types";

export class IronFinanceClient implements IIronFinanceClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly environment: IronEnvironment;
  private readonly fetchImpl: typeof fetch;

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

  constructor(config: IronClientConfig) {
    if (!config.apiKey) {
      throw new Error(
        "IRON_API_KEY is required — pass it explicitly to createIronClient.",
      );
    }
    this.apiKey = config.apiKey;
    this.environment = config.env === "production" ? "production" : "sandbox";
    this.apiUrl = config.baseUrl ?? resolveIronBaseUrl(this.environment);
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);

    // ─── customers ────────────────────────────────────────────────────────
    this.customers = {
      create: async (request, idempotencyKey) => {
        const name =
          request.business_name ||
          `${request.first_name || ""} ${request.last_name || ""}`.trim();

        const ironRequest = {
          customer_type:
            request.type === "individual" ? "Person" : "Business",
          email: request.email,
          name: name || request.email.split("@")[0],
          external_id: request.metadata?.external_id as string | undefined,
        };

        const response = await this.fetchImpl(`${this.apiUrl}/api/customers`, {
          method: "POST",
          headers: this.getHeaders(idempotencyKey || randomUUID()),
          body: JSON.stringify(ironRequest),
        });

        return this.handleResponse(response);
      },

      get: async (customerId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },

      list: async (request) => {
        const params = new URLSearchParams();
        if (request?.limit) params.append("limit", request.limit.toString());
        if (request?.offset) params.append("offset", request.offset.toString());
        if (request?.type) params.append("type", request.type);
        if (request?.kyc_status)
          params.append("kyc_status", request.kyc_status);

        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers?${params.toString()}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },

      update: async (customerId, request) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}`,
          {
            method: "PATCH",
            headers: this.getHeaders(),
            body: JSON.stringify(request),
          },
        );
        return this.handleResponse(response);
      },
    };

    // ─── kyc ──────────────────────────────────────────────────────────────
    this.kyc = {
      start: async (request, idempotencyKey) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${request.customer_id}/identifications/v2`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify({ type: "Link" }),
          },
        );
        return this.handleResponse(response);
      },

      startWithToken: async (
        request: StartKYCTokenRequest,
        idempotencyKey,
      ) => {
        const body: Record<string, unknown> = {
          type: "Token" as const,
          token: request.token,
          intended_use: request.intended_use,
        };
        if (request.ip_address) body.ip_address = request.ip_address;
        if (request.kyc_questionnaire)
          body.kyc_questionnaire = request.kyc_questionnaire;
        if (request.edd_questionnaire)
          body.edd_questionnaire = request.edd_questionnaire;

        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${request.customer_id}/identifications/v2`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(body),
          },
        );
        return this.handleResponse<Identification>(response);
      },

      getSession: async (sessionId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/kyc/sessions/${sessionId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },

      getStatus: async (
        customerId,
      ): Promise<{ status: KYCStatus; session?: KYCSession }> => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/kyc-status`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },
    };

    // ─── identifications ──────────────────────────────────────────────────
    this.identifications = {
      list: async (customerId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/identifications`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse<Identification[]>(response);
      },

      updateStatus: async (identificationId, approved, idempotencyKey) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/identification/${identificationId}`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify({ approved }),
          },
        );
        return this.handleResponse(response);
      },
    };

    // ─── signings ─────────────────────────────────────────────────────────
    this.signings = {
      listRequired: async (customerId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/required-signings`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },

      create: async (customerId, request, idempotencyKey) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/signings`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(request),
          },
        );
        return this.handleResponse(response);
      },
    };

    // ─── wallets ──────────────────────────────────────────────────────────
    this.wallets = {
      registerHosted: async (request, idempotencyKey) => {
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
        return this.handleResponse(response);
      },

      registerSelfHosted: async (request, idempotencyKey) => {
        // Iron exposes a single endpoint; kept as separate alias for callers.
        return this.wallets.registerHosted(request, idempotencyKey);
      },

      get: async (walletId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/wallets/${walletId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },

      list: async (customerId) => {
        const url = `${this.apiUrl}/api/addresses/crypto/${customerId}?filter=All`;
        const response = await this.fetchImpl(url, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (response.status === 404) return { data: [] };
        const raw =
          await this.handleResponse<VerifiedAddressResponse[]>(response);
        const data = (Array.isArray(raw) ? raw : []).map(
          (a): Wallet => ({
            id: a.id,
            customer_id: customerId,
            blockchain: a.blockchain as BlockchainType,
            wallet_address: a.wallet_address,
            address: a.wallet_address,
            is_hosted: a.address_type === "Hosted",
            created_at: a.created_at,
            updated_at: a.created_at,
          }),
        );
        return { data };
      },
    };

    // ─── bank ─────────────────────────────────────────────────────────────
    this.bank = {
      register: async (request, idempotencyKey) => {
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
                bank_name:
                  (request as SimpleBankAccountRequest).bank_name ?? "Unknown",
                bank_country: "US",
                street: "N/A",
                city: "N/A",
                state: "N/A",
                country: "US",
                postal_code: "00000",
                label: request.label,
                email: request.email,
                phone: request.phone,
              };

        const nameParts = req.account_holder_name.trim().split(/\s+/);
        const givenName = nameParts[0] || "";
        const familyName =
          nameParts.slice(1).join(" ") || nameParts[0] || "";

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
            // Required by Iron for USD (ACH) accounts; harmless for SEPA.
            ...(req.email ? { email_address: { email: req.email } } : {}),
            ...(req.phone ? { phone_number: req.phone } : {}),
          },
          label: req.label,
        };

        const response = await this.fetchImpl(
          `${this.apiUrl}/api/addresses/fiat`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(ironRequest),
          },
        );

        return this.handleResponse<FiatAddress>(response);
      },

      get: async (addressId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/addresses/fiat/${addressId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse<BankAccount>(response);
      },

      list: async (customerId) => {
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
            item.bank_account_identifier &&
            "iban" in item.bank_account_identifier
              ? item.bank_account_identifier.iban
              : undefined,
        }));
        return { data };
      },

      delete: async (addressId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/addresses/fiat/${addressId}`,
          { method: "DELETE", headers: this.getHeaders() },
        );
        return this.handleResponse<{ success: boolean }>(response);
      },
    };

    // ─── onramp ───────────────────────────────────────────────────────────
    this.onramp = {
      quote: async (request: OnrampQuoteRequest) => {
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
      },

      create: async (request: CreateOnrampRequest, idempotencyKey) => {
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
      },

      get: async (onrampId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps/${onrampId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        const data = await this.handleResponse<IronAutorampResponse>(response);
        return this.mapAutorampToOnramp(data);
      },

      list: async (customerId, limit, offset) => {
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
      },

      cancel: async (onrampId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps/${onrampId}`,
          { method: "DELETE", headers: this.getHeaders() },
        );
        const data = await this.handleResponse<IronAutorampResponse>(response);
        return this.mapAutorampToOnramp(data);
      },
    };

    // ─── offramp ──────────────────────────────────────────────────────────
    this.offramp = {
      quote: async (request: OfframpQuoteRequest) => {
        const params = new URLSearchParams({
          customer_id: request.customer_id,
          source_currency_code: request.source_currency,
          source_currency_chain: request.blockchain || "Base",
          destination_currency_code: request.destination_currency,
          rate_expiry_policy: "Return",
          expiry_in_hours: "24",
          is_third_party: "false",
        });
        // ACH/USD: Iron rejects `recipient_account` and requires the registered
        // fiat-address id via `recipient_account_id`. SEPA/EUR uses the IBAN as
        // `recipient_account`.
        if (request.recipient_account_id) {
          params.set("recipient_account_id", request.recipient_account_id);
        } else {
          params.set("recipient_account", request.bank_account_id);
        }

        if (request.source_amount) {
          params.set("amount_in", (request.source_amount / 1000000).toString());
        } else if (request.destination_amount) {
          params.set(
            "amount_out",
            (request.destination_amount / 100).toString(),
          );
        }

        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps/quote?${params.toString()}`,
          { method: "GET", headers: this.getHeaders() },
        );
        const data = await this.handleResponse<IronQuoteResponse>(response);
        return this.mapIronQuoteToQuote(data, "offramp");
      },

      create: async (request: CreateOfframpRequest, idempotencyKey) => {
        const blockchain = request.blockchain || "Base";
        const sourceCurrency = request.source_currency || "USDC";
        const destinationCurrency = request.destination_currency || "EUR";

        // ACH (USD) builds an inline ACH identifier from routing/account;
        // otherwise SEPA from the IBAN in bank_account_id.
        const accountIdentifier =
          request.routing_number && request.account_number
            ? {
                type: "ACH",
                routing_number: request.routing_number,
                account_number: request.account_number,
              }
            : { type: "SEPA", iban: request.bank_account_id };

        const autorampRequest: Record<string, unknown> = {
          customer_id: request.customer_id,
          destination_currency: { type: "Fiat", code: destinationCurrency },
          recipient_account: {
            type: "Fiat",
            account_identifier: accountIdentifier,
          },
          source_currencies: [
            { type: "Crypto", blockchain, token: sourceCurrency },
          ],
        };
        // Iron persists + echoes external_id (e.g. in autoramps.list) — used by
        // callers to recover display data the autoramp itself omits (amounts).
        if (request.external_id) {
          autorampRequest.external_id = request.external_id;
        }

        const response = await this.fetchImpl(`${this.apiUrl}/api/autoramps`, {
          method: "POST",
          headers: this.getHeaders(idempotencyKey || randomUUID()),
          body: JSON.stringify(autorampRequest),
        });
        const data = await this.handleResponse<IronAutorampResponse>(response);
        return this.mapAutorampToOfframp(data);
      },

      get: async (offrampId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps/${offrampId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        const data = await this.handleResponse<IronAutorampResponse>(response);
        return this.mapAutorampToOfframp(data);
      },

      list: async (customerId, limit, offset) => {
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
      },

      cancel: async (offrampId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps/${offrampId}`,
          { method: "DELETE", headers: this.getHeaders() },
        );
        const data = await this.handleResponse<IronAutorampResponse>(response);
        return this.mapAutorampToOfframp(data);
      },
    };

    // ─── quotes ───────────────────────────────────────────────────────────
    this.quotes = {
      get: async (quoteId) => {
        // Iron has no quote-by-ID endpoint; quotes are ephemeral.
        console.log("quoteId", quoteId);
        throw new Error(
          "Direct quote lookup not supported. Use onramp.quote or offramp.quote instead.",
        );
      },
    };

    // ─── thirdPartyPayments ───────────────────────────────────────────────
    this.thirdPartyPayments = {
      create: async (request, idempotencyKey) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/third-party-payments`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(request),
          },
        );
        return this.handleResponse<ThirdPartyPayment>(response);
      },

      get: async (paymentId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/third-party-payments/${paymentId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse<ThirdPartyPayment>(response);
      },

      list: async (customerId, limit, offset) => {
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
      },
    };

    // ─── autoramps ────────────────────────────────────────────────────────
    this.autoramps = {
      list: async (customerId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/autoramps?customer_id=${customerId}`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse<PagedAutorampsResponse>(response);
      },
    };

    // ─── virtualAccounts ──────────────────────────────────────────────────
    this.virtualAccounts = {
      list: async (customerId) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/virtual-accounts`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse<PagedVirtualAccountsResponse>(response);
      },

      create: async (customerId, request, idempotencyKey) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/customers/${customerId}/virtual-accounts`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(request),
          },
        );
        return this.handleResponse<VirtualAccount>(response);
      },
    };

    // ─── metadata ─────────────────────────────────────────────────────────
    this.metadata = {
      listFiatCurrencies: async () => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/fiatcurrencies`,
          { method: "GET", headers: this.getHeaders() },
        );
        return this.handleResponse(response);
      },
    };

    // ─── sandbox ──────────────────────────────────────────────────────────
    this.sandbox = {
      approveAutoramp: async (autorampId) => {
        await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/autoramp/${autorampId}`,
          {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify("Approved"),
          },
        ).then((r) => this.assertOk(r));
      },

      setAutorampStatus: async (autorampId, status) => {
        await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/autoramp/${autorampId}`,
          {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(status),
          },
        ).then((r) => this.assertOk(r));
      },

      approveFiatAddress: async (fiatAddressId) => {
        await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/fiat-verification/${fiatAddressId}`,
          {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify("Registered"),
          },
        ).then((r) => this.assertOk(r));
      },

      setFiatAddressStatus: async (fiatAddressId, status) => {
        await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/fiat-verification/${fiatAddressId}`,
          {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(status),
          },
        ).then((r) => this.assertOk(r));
      },

      createTransaction: async (
        request: CreateSandboxTransactionRequest,
        idempotencyKey,
      ) => {
        const response = await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/transaction`,
          {
            method: "POST",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify(request),
          },
        );
        return this.handleResponse<SandboxTransaction>(response);
      },

      setTransactionState: async (transactionId, state, idempotencyKey) => {
        await this.fetchImpl(
          `${this.apiUrl}/api/sandbox/transaction/${transactionId}/state`,
          {
            method: "PUT",
            headers: this.getHeaders(idempotencyKey || randomUUID()),
            body: JSON.stringify({ state }),
          },
        ).then((r) => this.assertOk(r));
      },

      reset: async (idempotencyKey) => {
        await this.fetchImpl(`${this.apiUrl}/api/sandbox/reset`, {
          method: "POST",
          headers: this.getHeaders(idempotencyKey || randomUUID()),
        }).then((r) => this.assertOk(r));
      },
    };
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

  private async assertOk(response: Response): Promise<void> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Iron Finance API error: ${response.status} - ${errorText}`,
      );
    }
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

  private mapAutorampStatus(status: string): RampStatus {
    const statusMap: Record<string, RampStatus> = {
      Created: "pending",
      EditPending: "pending",
      Authorized: "processing",
      DepositAccountAdded: "processing",
      Approved: "processing",
      Rejected: "failed",
      Cancelled: "cancelled",
    };
    return statusMap[status] || "pending";
  }

  isSandbox(): boolean {
    return this.environment === "sandbox";
  }
}

/**
 * Factory for an `IronFinanceClient`. Sandbox-by-default per D-005. `apiKey`
 * is required — the constructor no longer reads `process.env`. The
 * dashboard-side helper `apps/dashboard/src/lib/iron/client.ts` is the only
 * sanctioned env-reader.
 */
export function createIronClient(config: IronClientConfig): IronFinanceClient {
  return new IronFinanceClient(config);
}
