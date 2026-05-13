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
  it("MockIronClient exposes the 13 expected namespaces", () => {
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
