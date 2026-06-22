/**
 * Surface + contract tests for `IronFinanceClient`.
 *
 * Surface tests assert the namespace shape on `MockIronClient`. Contract tests
 * mock `fetch` to assert URL + headers + idempotency without hitting the
 * network — exercised through the new namespace surface.
 */
import { describe, expect, it, vi } from "vitest";
import { IronFinanceClient } from "../client";
import { MockIronClient } from "../mock-client";

type FetchCall = [input: RequestInfo | URL, init?: RequestInit];

function mockFetch(json: unknown, status = 200) {
  return vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(
    async () =>
      new Response(JSON.stringify(json), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("IronFinanceClient namespace surface", () => {
  it("MockIronClient exposes the 14 expected namespaces", () => {
    const mock = new MockIronClient();
    expect(mock.customers).toBeDefined();
    expect(mock.kyc).toBeDefined();
    expect(mock.identifications).toBeDefined();
    expect(mock.signings).toBeDefined();
    expect(mock.wallets).toBeDefined();
    expect(mock.bank).toBeDefined();
    expect(mock.onramp).toBeDefined();
    expect(mock.offramp).toBeDefined();
    expect(mock.quotes).toBeDefined();
    expect(mock.thirdPartyPayments).toBeDefined();
    expect(mock.autoramps).toBeDefined();
    expect(mock.virtualAccounts).toBeDefined();
    expect(mock.metadata).toBeDefined();
    expect(mock.sandbox).toBeDefined();
  });

  it("customers namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.customers.create).toBe("function");
    expect(typeof mock.customers.get).toBe("function");
    expect(typeof mock.customers.list).toBe("function");
    expect(typeof mock.customers.update).toBe("function");
  });

  it("kyc namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.kyc.start).toBe("function");
    expect(typeof mock.kyc.getSession).toBe("function");
    expect(typeof mock.kyc.getStatus).toBe("function");
  });

  it("identifications namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.identifications.list).toBe("function");
    expect(typeof mock.identifications.updateStatus).toBe("function");
  });

  it("signings namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.signings.listRequired).toBe("function");
    expect(typeof mock.signings.create).toBe("function");
  });

  it("wallets namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.wallets.registerHosted).toBe("function");
    expect(typeof mock.wallets.registerSelfHosted).toBe("function");
    expect(typeof mock.wallets.get).toBe("function");
    expect(typeof mock.wallets.list).toBe("function");
  });

  it("bank namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.bank.register).toBe("function");
    expect(typeof mock.bank.get).toBe("function");
    expect(typeof mock.bank.list).toBe("function");
    expect(typeof mock.bank.delete).toBe("function");
  });

  it("onramp namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.onramp.quote).toBe("function");
    expect(typeof mock.onramp.create).toBe("function");
    expect(typeof mock.onramp.get).toBe("function");
    expect(typeof mock.onramp.list).toBe("function");
    expect(typeof mock.onramp.cancel).toBe("function");
  });

  it("offramp namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.offramp.quote).toBe("function");
    expect(typeof mock.offramp.create).toBe("function");
    expect(typeof mock.offramp.get).toBe("function");
    expect(typeof mock.offramp.list).toBe("function");
    expect(typeof mock.offramp.cancel).toBe("function");
  });

  it("quotes namespace exposes get", () => {
    const mock = new MockIronClient();
    expect(typeof mock.quotes.get).toBe("function");
  });

  it("thirdPartyPayments namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.thirdPartyPayments.create).toBe("function");
    expect(typeof mock.thirdPartyPayments.get).toBe("function");
    expect(typeof mock.thirdPartyPayments.list).toBe("function");
  });

  it("autoramps namespace exposes list", () => {
    const mock = new MockIronClient();
    expect(typeof mock.autoramps.list).toBe("function");
  });

  it("virtualAccounts namespace exposes the expected methods", () => {
    const mock = new MockIronClient();
    expect(typeof mock.virtualAccounts.list).toBe("function");
    expect(typeof mock.virtualAccounts.create).toBe("function");
  });

  it("metadata namespace exposes listFiatCurrencies", () => {
    const mock = new MockIronClient();
    expect(typeof mock.metadata.listFiatCurrencies).toBe("function");
  });
});

describe("IronFinanceClient — fetch contract via namespaces", () => {
  it("hits the sandbox base URL by default and sets X-API-Key", async () => {
    const fetchImpl = mockFetch({
      id: "cus_1",
      kyc_status: "not_started",
      type: "individual",
      email: "ada@example.com",
      created_at: "x",
      updated_at: "x",
    });
    const client = new IronFinanceClient({
      apiKey: "k_test_123",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(client.isSandbox()).toBe(true);

    await client.customers.get("cus_1");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    const [url, init] = call;
    expect(url).toBe("https://api.sandbox.iron.xyz/api/customers/cus_1");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("k_test_123");
    expect(headers["Content-Type"]).toContain("application/json");
  });

  it("hits production base URL when env=production", async () => {
    const fetchImpl = mockFetch([]);
    const client = new IronFinanceClient({
      env: "production",
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.metadata.listFiatCurrencies();
    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe("https://api.iron.xyz/api/fiatcurrencies");
  });

  it("sends idempotency key on POST", async () => {
    const fetchImpl = mockFetch({
      id: "cus_1",
      kyc_status: "not_started",
      type: "individual",
      email: "ada@example.com",
      created_at: "x",
      updated_at: "x",
    });
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.customers.create(
      { type: "individual", email: "ada@example.com" },
      "idemp-123",
    );
    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBe("idemp-123");
  });

  it("returns empty list when wallets.list 404s", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.wallets.list("cus_1");
    expect(result).toEqual({ data: [] });
  });

  it("throws when apiKey is missing", () => {
    expect(
      () =>
        new IronFinanceClient({
          apiKey: "",
        }),
    ).toThrow(/IRON_API_KEY is required/);
  });
});

describe("IronFinanceClient — sandbox namespace", () => {
  it("MockIronClient exposes the sandbox namespace with all 7 methods", () => {
    const mock = new MockIronClient();
    expect(mock.sandbox).toBeDefined();
    expect(typeof mock.sandbox.approveAutoramp).toBe("function");
    expect(typeof mock.sandbox.setAutorampStatus).toBe("function");
    expect(typeof mock.sandbox.approveFiatAddress).toBe("function");
    expect(typeof mock.sandbox.setFiatAddressStatus).toBe("function");
    expect(typeof mock.sandbox.createTransaction).toBe("function");
    expect(typeof mock.sandbox.setTransactionState).toBe("function");
    expect(typeof mock.sandbox.reset).toBe("function");
  });

  it("sandbox.approveAutoramp sends PUT with JSON string body", async () => {
    const fetchImpl = mockFetch(null);
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.sandbox.approveAutoramp("ar_123");

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/sandbox/autoramp/ar_123",
    );
    expect(call[1]?.method).toBe("PUT");
    expect(call[1]?.body).toBe(JSON.stringify("Approved"));
  });

  it("sandbox.setAutorampStatus sends the given status", async () => {
    const fetchImpl = mockFetch(null);
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.sandbox.setAutorampStatus("ar_123", "Rejected");

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/sandbox/autoramp/ar_123",
    );
    expect(call[1]?.body).toBe(JSON.stringify("Rejected"));
  });

  it("sandbox.approveFiatAddress sends PUT with Registered", async () => {
    const fetchImpl = mockFetch(null);
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.sandbox.approveFiatAddress("fa_456");

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/sandbox/fiat-verification/fa_456",
    );
    expect(call[1]?.method).toBe("PUT");
    expect(call[1]?.body).toBe(JSON.stringify("Registered"));
  });

  it("sandbox.createTransaction sends POST with request body and idempotency key", async () => {
    const fetchImpl = mockFetch({
      id: "txn_1",
      autoramp_id: "ar_123",
      amount_in: "100",
      currency_in: "EUR",
      amount_out: "99.75",
      currency_out: "USDC",
      customer_id: "cus_1",
      state: "Pending",
      created_at: "2026-01-15T10:30:00Z",
    });
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.sandbox.createTransaction({
      autoramp_id: "ar_123",
      amount: "100",
    });

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/sandbox/transaction",
    );
    expect(call[1]?.method).toBe("POST");
    const body = JSON.parse(call[1]?.body as string);
    expect(body.autoramp_id).toBe("ar_123");
    expect(body.amount).toBe("100");
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBeDefined();
    expect(result.id).toBe("txn_1");
    expect(result.state).toBe("Pending");
  });

  it("sandbox.setTransactionState sends PUT with state body", async () => {
    const fetchImpl = mockFetch(null);
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.sandbox.setTransactionState("txn_1", "Completed");

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/sandbox/transaction/txn_1/state",
    );
    expect(call[1]?.method).toBe("PUT");
    const body = JSON.parse(call[1]?.body as string);
    expect(body.state).toBe("Completed");
  });

  it("sandbox.reset sends POST to /api/sandbox/reset", async () => {
    const fetchImpl = mockFetch(null);
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.sandbox.reset("idemp-reset");

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe("https://api.sandbox.iron.xyz/api/sandbox/reset");
    expect(call[1]?.method).toBe("POST");
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBe("idemp-reset");
  });
});

describe("IronFinanceClient — SumSub token sharing", () => {
  it("MockIronClient.kyc exposes startWithToken", () => {
    const mock = new MockIronClient();
    expect(typeof mock.kyc.startWithToken).toBe("function");
  });

  it("kyc.startWithToken sends POST with type Token body", async () => {
    const fetchImpl = mockFetch({
      id: "ident_1",
      customer_id: "cus_1",
      status: "Processed",
      with_edd: false,
      url: null,
      created_at: "2026-01-15T10:30:00Z",
      updated_at: "2026-01-15T10:30:00Z",
    });
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.kyc.startWithToken({
      customer_id: "cus_1",
      token: "sumsub-share-token-abc",
      intended_use: "Investing",
    });

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    expect(call[0]).toBe(
      "https://api.sandbox.iron.xyz/api/customers/cus_1/identifications/v2",
    );
    expect(call[1]?.method).toBe("POST");
    const body = JSON.parse(call[1]?.body as string);
    expect(body.type).toBe("Token");
    expect(body.token).toBe("sumsub-share-token-abc");
    expect(body.intended_use).toBe("Investing");
    expect(body).not.toHaveProperty("ip_address");
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBeDefined();
    expect(result.id).toBe("ident_1");
    expect(result.status).toBe("Processed");
  });

  it("kyc.startWithToken includes optional fields when provided", async () => {
    const fetchImpl = mockFetch({
      id: "ident_2",
      customer_id: "cus_2",
      status: "Pending",
      with_edd: true,
      url: "https://iron.xyz/kyc/complete",
      created_at: "2026-01-15T10:30:00Z",
      updated_at: "2026-01-15T10:30:00Z",
    });
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.kyc.startWithToken({
      customer_id: "cus_2",
      token: "sumsub-share-token-def",
      intended_use: "Trading",
      ip_address: "1.2.3.4",
      kyc_questionnaire: {
        employment_status: "Employed",
        yearly_gross_income: "50000",
        source_of_wealth: "Salary",
        expected_monthly_transaction_count: "LessThan5",
        expected_monthly_transaction_volume: "LessThan500",
      },
      edd_questionnaire: {
        occupation: "Software Engineer",
        approximate_net_worth: "100000",
      },
    });

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    const body = JSON.parse(call[1]?.body as string);
    expect(body.type).toBe("Token");
    expect(body.ip_address).toBe("1.2.3.4");
    expect(body.kyc_questionnaire.employment_status).toBe("Employed");
    expect(body.edd_questionnaire.occupation).toBe("Software Engineer");
    expect(result.status).toBe("Pending");
    expect(result.url).toBe("https://iron.xyz/kyc/complete");
    expect(result.with_edd).toBe(true);
  });

  it("kyc.startWithToken uses provided idempotency key", async () => {
    const fetchImpl = mockFetch({
      id: "ident_3",
      customer_id: "cus_3",
      status: "Processed",
      created_at: "2026-01-15T10:30:00Z",
      updated_at: "2026-01-15T10:30:00Z",
    });
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.kyc.startWithToken(
      {
        customer_id: "cus_3",
        token: "token-xyz",
        intended_use: "PurchaseDigitalAssets",
      },
      "my-idemp-key",
    );

    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBe("my-idemp-key");
  });
});
