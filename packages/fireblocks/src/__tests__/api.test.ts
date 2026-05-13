import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { createApiClient, FireblocksApiError } from "../api";

function genKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return privateKey;
}

describe("createApiClient", () => {
  const config = {
    apiKey: "test-api-key",
    secretKey: genKey(),
    basePath: "https://sandbox-api.fireblocks.io/v1",
  };

  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET — sets Authorization + X-API-Key, no body, returns parsed JSON", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const api = createApiClient(config);
    const result = await api.get<{ ok: boolean }>("/vault/accounts");
    expect(result).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://sandbox-api.fireblocks.io/v1/vault/accounts");
    expect(init.method).toBe("GET");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("test-api-key");
    expect(headers.Authorization).toMatch(/^Bearer eyJ/);
    expect(init.body).toBeUndefined();
  });

  it("GET with query — appends ?key=value", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    const api = createApiClient(config);
    await api.get("/vault/accounts", { limit: 50, after: "abc" });
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://sandbox-api.fireblocks.io/v1/vault/accounts?limit=50&after=abc");
  });

  it("POST — serializes body, sets Content-Type", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "tx-1" }), { status: 201 }));
    const api = createApiClient(config);
    const result = await api.post<{ id: string }>("/transactions", { amount: "10" });
    expect(result).toEqual({ id: "tx-1" });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ amount: "10" });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("wraps non-2xx as FireblocksApiError with status + body", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Not found", code: "NOT_FOUND" }), { status: 404 }),
    );
    const api = createApiClient(config);
    await expect(api.get("/missing")).rejects.toMatchObject({
      name: "FireblocksApiError",
      status: 404,
      code: "NOT_FOUND",
      responseBody: { message: "Not found", code: "NOT_FOUND" },
    });
  });

  it("wraps non-JSON error response as FireblocksApiError with raw text", async () => {
    fetchMock.mockResolvedValue(new Response("<html>504</html>", { status: 504 }));
    const api = createApiClient(config);
    await expect(api.get("/slow")).rejects.toMatchObject({
      status: 504,
      responseBody: { raw: "<html>504</html>" },
    });
  });
});
