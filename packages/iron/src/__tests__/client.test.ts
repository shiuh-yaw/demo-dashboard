/**
 * Contract test for `IronFinanceClient` — mocks `fetch` to assert URL +
 * headers + idempotency behavior without hitting the network.
 */
import { describe, it, expect, vi } from "vitest";
import { IronFinanceClient } from "../client";

type FetchCall = [input: RequestInfo | URL, init?: RequestInit];

function mockFetch(json: unknown, status = 200) {
  return vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify(json), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("IronFinanceClient", () => {
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

    await client.getCustomer("cus_1");

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
    await client.listFiatCurrencies();
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
    await client.createCustomer(
      { type: "individual", email: "ada@example.com" },
      "idemp-123",
    );
    const call = fetchImpl.mock.calls[0] as unknown as FetchCall;
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["IDEMPOTENCY-KEY"]).toBe("idemp-123");
  });

  it("returns empty list when listWallets 404s", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    const client = new IronFinanceClient({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.listWallets("cus_1");
    expect(result).toEqual({ data: [] });
  });
});
