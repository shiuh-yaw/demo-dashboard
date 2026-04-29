import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from "undici";

vi.mock("@/lib/env", () => ({
  env: {
    DYNAMIC_API_KEY: "dyn_test",
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: "env-1",
    SPARK26_DESTINATION_ADDRESS: "0xdest",
  },
}));

let previousDispatcher: ReturnType<typeof getGlobalDispatcher>;
let mockAgent: MockAgent;

beforeEach(() => {
  previousDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(previousDispatcher);
});

describe("createCheckout", () => {
  it("POSTs to /environments/{envId}/checkouts with payment mode, Base USDC settlement, and destination wallet", async () => {
    const pool = mockAgent.get("https://app.dynamic.xyz");
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    pool
      .intercept({
        path: "/api/v0/environments/env-1/checkouts",
        method: "POST",
      })
      .reply((opts) => {
        capturedBody = opts.body ? JSON.parse(opts.body as string) : null;
        const headers = opts.headers as Record<string, string> | string[];
        if (Array.isArray(headers)) {
          const idx = headers.findIndex(
            (h, i) => i % 2 === 0 && h.toLowerCase() === "authorization"
          );
          capturedAuth = idx >= 0 ? headers[idx + 1] ?? null : null;
        } else {
          capturedAuth = headers["authorization"] ?? headers["Authorization"] ?? null;
        }
        return {
          statusCode: 201,
          data: JSON.stringify({
            id: "chk-1",
            mode: "payment",
            createdAt: "2026-04-21T00:00:00Z",
            updatedAt: "2026-04-21T00:00:00Z",
          }),
          responseOptions: { headers: { "content-type": "application/json" } },
        };
      });

    // Env mock applied *after* imports are primed via vi.mock
    const { createCheckout } = await import("./server.js");
    const result = await createCheckout({
      destinationAddress: "0xDeadBeef0000000000000000000000000000dEaD",
    });
    expect(result).toEqual({ checkoutId: "chk-1" });
    expect(capturedAuth).toBe("Bearer dyn_test");
    expect(capturedBody).toMatchObject({
      mode: "payment",
      settlementConfig: {
        strategy: "cheapest",
        settlements: [
          expect.objectContaining({
            // Dynamic's ChainEnum uses "EVM" for any non-Ethereum-mainnet
            // EVM chain (Base, Arbitrum, Optimism, Polygon, etc.). The
            // specific chain is identified by chainId ("8453" = Base).
            // "BASE" is NOT a valid ChainEnum value — the API returns 400.
            chainName: "EVM",
            chainId: "8453",
            symbol: "USDC",
            tokenDecimals: 6,
            isNative: false,
          }),
        ],
      },
      destinationConfig: {
        destinations: [
          {
            chainName: "EVM",
            type: "address",
            identifier: "0xDeadBeef0000000000000000000000000000dEaD",
          },
        ],
      },
    });
  });

  it("throws on non-2xx response with the status code in the message", async () => {
    const pool = mockAgent.get("https://app.dynamic.xyz");
    pool
      .intercept({
        path: "/api/v0/environments/env-1/checkouts",
        method: "POST",
      })
      .reply(401, { error: "unauthorized" });
    const { createCheckout } = await import("./server.js");
    await expect(
      createCheckout({ destinationAddress: "0xabc" })
    ).rejects.toThrow(/401/);
  });
});
