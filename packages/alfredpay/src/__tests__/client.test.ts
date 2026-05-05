import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAlfredpayClient,
  createOfframp,
  getOfframpStatus,
} from "../client";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(
  body: unknown,
  init: { status?: number } = {},
) {
  const status = init.status ?? 200;
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createAlfredpayClient", () => {
  it("defaults to the sandbox base URL when env='sandbox'", () => {
    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "test-key",
    });
    expect(client.env).toBe("sandbox");
    expect(client.baseUrl).toBe("https://api.sandbox.alfredpay.io");
  });

  it("uses the production base URL when env='production'", () => {
    const client = createAlfredpayClient({
      env: "production",
      apiKey: "test-key",
    });
    expect(client.env).toBe("production");
    expect(client.baseUrl).toBe("https://api.alfredpay.io");
  });

  it("requires an apiKey", () => {
    expect(() =>
      // @ts-expect-error — intentional: missing apiKey
      createAlfredpayClient({ env: "sandbox" }),
    ).toThrow(/apiKey is required/i);
  });

  it("sends Authorization Bearer + JSON headers on every request", async () => {
    const fetchMock = mockFetchOnce({ id: "abc", status: "received" });
    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "secret-token",
    });
    await client.request("GET", "/v1/ping");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.sandbox.alfredpay.io/v1/ping");
    expect(init.method).toBe("GET");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer secret-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("throws AlfredpayApiError when the response is non-2xx", async () => {
    mockFetchOnce({ message: "boom" }, { status: 500 });
    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "secret",
    });
    await expect(client.request("GET", "/v1/ping")).rejects.toMatchObject({
      name: "AlfredpayApiError",
      status: 500,
    });
  });
});

describe("createOfframp", () => {
  it("POSTs to /v1/offramps and returns the parsed payload", async () => {
    const fetchMock = mockFetchOnce({
      id: "off_123",
      status: "received",
      amount: "100.00",
      currency: "USD",
      destination_currency: "BRL",
    });

    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "secret",
    });

    const result = await createOfframp(client, {
      amount: "100.00",
      currency: "USD",
      destinationCurrency: "BRL",
      country: "BR",
      rail: "pix",
      beneficiary: { pixKey: "user@example.com" },
    });

    expect(result.id).toBe("off_123");
    expect(result.status).toBe("received");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.sandbox.alfredpay.io/v1/offramps");
    expect(init.method).toBe("POST");
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody).toMatchObject({
      amount: "100.00",
      currency: "USD",
      destination_currency: "BRL",
      country: "BR",
      rail: "pix",
      beneficiary: { pix_key: "user@example.com" },
    });
  });
});

describe("getOfframpStatus", () => {
  it("GETs /v1/offramps/:id and returns the parsed payload", async () => {
    const fetchMock = mockFetchOnce({
      id: "off_123",
      status: "completed",
      amount: "100.00",
      currency: "USD",
      destination_currency: "BRL",
    });

    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "secret",
    });

    const status = await getOfframpStatus(client, "off_123");

    expect(status.id).toBe("off_123");
    expect(status.status).toBe("completed");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.sandbox.alfredpay.io/v1/offramps/off_123");
    expect(init.method).toBe("GET");
  });

  it("rejects an empty offramp id at the call site", async () => {
    const client = createAlfredpayClient({
      env: "sandbox",
      apiKey: "secret",
    });
    await expect(getOfframpStatus(client, "")).rejects.toThrow(
      /offramp id is required/i,
    );
  });
});
