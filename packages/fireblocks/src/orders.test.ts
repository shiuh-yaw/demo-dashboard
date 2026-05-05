/**
 * Tests for the Fireblocks Orders API client.
 *
 * The client is auth-heavy and network-bound, so each test stubs
 * `globalThis.fetch` with a minimal recorder. We verify:
 *   - request shape (method, path, headers, body)
 *   - response parsing
 *   - typed errors on non-2xx
 *
 * No real network calls are made.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  createOrder,
  FireblocksOrdersError,
  getOrder,
  listOrders,
  type FireblocksOrder,
  type FireblocksOrdersClient,
} from "./orders";

// ─── Test fixtures ───────────────────────────────────────────────────────────

let TEST_PRIVATE_KEY_PEM: string;

beforeAll(() => {
  // RSA key generated once per test run; signing is real (jose) — we
  // only stub the network. This keeps the test true to the JWT auth
  // flow without baking a static key into the repo.
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  TEST_PRIVATE_KEY_PEM = privateKey.export({
    format: "pem",
    type: "pkcs8",
  }) as string;
});

function makeClient(
  overrides: Partial<FireblocksOrdersClient> = {},
): FireblocksOrdersClient {
  return {
    apiKey: "test-api-key",
    apiSecretPem: TEST_PRIVATE_KEY_PEM,
    env: "sandbox",
    baseUrl: "https://test.fireblocks.example",
    ...overrides,
  };
}

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function stubFetch(
  responder: (
    call: FetchCall,
  ) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>,
): { calls: FetchCall[]; firstCall: () => FetchCall; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string" ? input : input.toString();
    const call: FetchCall = { url, init };
    calls.push(call);
    const { status, body } = await responder(call);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return {
    calls,
    /** Convenience accessor — narrows `calls[0]` for strict `noUncheckedIndexedAccess`. */
    firstCall: () => {
      const c = calls[0];
      if (!c) throw new Error("stubFetch: no calls were recorded");
      return c;
    },
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── listOrders ──────────────────────────────────────────────────────────────

describe("listOrders", () => {
  it("returns parsed FireblocksOrder[] for a fixture response", async () => {
    const fixture: FireblocksOrder[] = [
      {
        id: "ord_1",
        status: "SUBMITTED",
        side: "SELL",
        baseAmount: "100",
        baseAssetId: "USD",
        quoteAssetId: "USDC_POLYGON_NXTB",
        createdAt: "2025-01-01T00:00:00Z",
        destination: {
          type: "ONE_TIME_ADDRESS",
          address: "0xabc",
        },
      },
    ];

    const stub = stubFetch(() => ({
      status: 200,
      body: { data: fixture },
    }));

    const client = makeClient();
    const orders = await listOrders(client, { pageSize: 25 });

    expect(orders).toEqual(fixture);
    expect(stub.calls).toHaveLength(1);
    expect(stub.firstCall().url).toBe(
      "https://test.fireblocks.example/v1/trading/orders?pageSize=25",
    );
    expect(stub.firstCall().init?.method).toBe("GET");

    const headers = stub.firstCall().init?.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("test-api-key");
    expect(headers["Authorization"]).toMatch(/^Bearer eyJ/); // JWT

    stub.restore();
  });

  it("defaults pageSize to 50 when omitted", async () => {
    const stub = stubFetch(() => ({ status: 200, body: { data: [] } }));
    await listOrders(makeClient());
    expect(stub.firstCall().url).toContain("pageSize=50");
    stub.restore();
  });

  it("returns [] when response has no data field", async () => {
    const stub = stubFetch(() => ({ status: 200, body: {} }));
    const orders = await listOrders(makeClient());
    expect(orders).toEqual([]);
    stub.restore();
  });

  it("surfaces upstream errors as FireblocksOrdersError", async () => {
    const stub = stubFetch(() => ({
      status: 401,
      body: { message: "invalid signature" },
    }));

    await expect(listOrders(makeClient())).rejects.toBeInstanceOf(
      FireblocksOrdersError,
    );

    try {
      await listOrders(makeClient());
    } catch (err) {
      expect(err).toBeInstanceOf(FireblocksOrdersError);
      const e = err as FireblocksOrdersError;
      expect(e.status).toBe(401);
      expect(e.path).toContain("/v1/trading/orders");
      expect(e.body).toMatchObject({ message: "invalid signature" });
      expect(e.message).toBe("invalid signature");
    }

    stub.restore();
  });
});

// ─── getOrder ────────────────────────────────────────────────────────────────

describe("getOrder", () => {
  it("returns the order body and URL-encodes the id", async () => {
    const fixture: FireblocksOrder = {
      id: "ord/with slash",
      status: "FILLED",
      createdAt: "2025-01-02T00:00:00Z",
    };
    const stub = stubFetch(() => ({ status: 200, body: fixture }));

    const got = await getOrder(makeClient(), "ord/with slash");
    expect(got).toEqual(fixture);
    expect(stub.firstCall().url).toBe(
      "https://test.fireblocks.example/v1/trading/orders/ord%2Fwith%20slash",
    );
    stub.restore();
  });
});

// ─── createOrder ─────────────────────────────────────────────────────────────

describe("createOrder", () => {
  it("posts the right body for PREFUNDED on-ramps", async () => {
    const fixture: FireblocksOrder = {
      id: "ord_2",
      status: "SUBMITTED",
      createdAt: "2025-01-01T00:00:00Z",
    };
    const stub = stubFetch(() => ({ status: 201, body: fixture }));

    const result = await createOrder(makeClient(), {
      side: "SELL",
      baseAmount: "100",
      baseAssetId: "USD",
      quoteAssetId: "USDC_POLYGON_NXTB",
      settlementType: "PREFUNDED",
      via: { providerId: "FIREBLOCKS", accountId: "acct-1" },
      destinationAddress: "0xdead",
      customerInternalReferenceId: "demo-2025-01",
      note: "test note",
    });

    expect(result.orderId).toBe("ord_2");
    expect(result.status).toBe("SUBMITTED");
    expect(result.raw).toEqual(fixture);

    expect(stub.firstCall().init?.method).toBe("POST");
    const sentBody = JSON.parse(stub.firstCall().init?.body as string);
    expect(sentBody).toEqual({
      via: {
        type: "PROVIDER_ACCOUNT",
        providerId: "FIREBLOCKS",
        accountId: "acct-1",
      },
      executionRequestDetails: {
        type: "MARKET",
        side: "SELL",
        baseAmount: "100",
        baseAssetId: "USD",
        quoteAssetId: "USDC_POLYGON_NXTB",
      },
      settlement: {
        type: "PREFUNDED",
        destinationAccount: {
          type: "ONE_TIME_ADDRESS",
          address: "0xdead",
        },
      },
      customerInternalReferenceId: "demo-2025-01",
      note: "test note",
    });

    stub.restore();
  });

  it("posts beneficiary + settlementType=DVP for off-ramps", async () => {
    const fixture: FireblocksOrder = {
      id: "ord_3",
      status: "SUBMITTED",
      createdAt: "2025-01-01T00:00:00Z",
    };
    const stub = stubFetch(() => ({ status: 201, body: fixture }));

    const beneficiary = {
      accountName: "Acme",
      bank: "Banco Demo",
      clabe: "00200001234567890",
      accountNumber: "1234567890",
    };

    await createOrder(makeClient(), {
      side: "SELL",
      baseAmount: "50",
      baseAssetId: "USDC_ETH_TEST5_0GER",
      quoteAssetId: "MXN",
      settlementType: "DVP",
      via: { providerId: "ALFREDPAY_TEST", accountId: "acct-alfred" },
      beneficiary,
    });

    const sentBody = JSON.parse(stub.firstCall().init?.body as string);
    expect(sentBody.executionRequestDetails.settlementType).toBe("DVP");
    expect(sentBody.beneficiary).toEqual(beneficiary);
    expect(sentBody.settlement).toBeUndefined();
    stub.restore();
  });

  it("throws when PREFUNDED is missing destinationAddress", async () => {
    await expect(
      createOrder(makeClient(), {
        side: "SELL",
        baseAmount: "1",
        baseAssetId: "USD",
        quoteAssetId: "USDC",
        settlementType: "PREFUNDED",
        via: { providerId: "p", accountId: "a" },
      }),
    ).rejects.toThrow(/destinationAddress is required/);
  });

  it("throws when DVP is missing beneficiary", async () => {
    await expect(
      createOrder(makeClient(), {
        side: "SELL",
        baseAmount: "1",
        baseAssetId: "USDC",
        quoteAssetId: "MXN",
        settlementType: "DVP",
        via: { providerId: "p", accountId: "a" },
      }),
    ).rejects.toThrow(/beneficiary is required/);
  });

  it("surfaces upstream errors as FireblocksOrdersError", async () => {
    const stub = stubFetch(() => ({
      status: 500,
      body: { message: "boom" },
    }));

    await expect(
      createOrder(makeClient(), {
        side: "BUY",
        baseAmount: "1",
        baseAssetId: "USD",
        quoteAssetId: "USDC",
        settlementType: "PREFUNDED",
        via: { providerId: "p", accountId: "a" },
        destinationAddress: "0x1",
      }),
    ).rejects.toBeInstanceOf(FireblocksOrdersError);

    stub.restore();
  });
});

// ─── Environment routing ─────────────────────────────────────────────────────

describe("environment routing", () => {
  it("uses the production base URL when env=production", async () => {
    const stub = stubFetch(() => ({ status: 200, body: { data: [] } }));
    await listOrders(
      makeClient({ baseUrl: undefined, env: "production" }),
    );
    expect(stub.firstCall().url).toMatch(/^https:\/\/api\.fireblocks\.io\//);
    stub.restore();
  });

  it("uses the sandbox base URL when env=sandbox", async () => {
    const stub = stubFetch(() => ({ status: 200, body: { data: [] } }));
    await listOrders(makeClient({ baseUrl: undefined, env: "sandbox" }));
    expect(stub.firstCall().url).toMatch(
      /^https:\/\/sandbox-api\.fireblocks\.io\//,
    );
    stub.restore();
  });
});
