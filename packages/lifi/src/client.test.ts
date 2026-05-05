/**
 * Tests for the LI.FI REST client.
 *
 * The client is network-bound — each test stubs `globalThis.fetch` with
 * a minimal recorder. We verify:
 *   - request URL / method / headers match the LI.FI REST contract
 *   - quote response is normalised into the package's `LifiRoute` shape
 *   - non-2xx responses surface a typed `LifiError`
 *   - status fetch errors fall back to PENDING (so worker retries)
 *
 * No real network calls are made.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLifiClient,
  getQuote,
  getStatus,
  LifiError,
} from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function stubFetch(
  responder: (call: FetchCall) => Response | Promise<Response>,
): FetchCall[] {
  const calls: FetchCall[] = [];
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const call: FetchCall = { url, init };
      calls.push(call);
      return responder(call);
    });
  // Touch fetchSpy so TypeScript keeps the import; we restore in afterEach.
  void fetchSpy;
  return calls;
}

function makeClient() {
  return createLifiClient({
    env: "sandbox",
    apiKey: "test-key",
    integrator: "test-integrator",
    apiUrl: "https://li.test/v1",
  });
}

describe("getQuote", () => {
  it("requests /quote/toAmount with the expected query + headers", async () => {
    const calls = stubFetch(() =>
      new Response(
        JSON.stringify({
          id: "step-1",
          type: "swap",
          tool: "lifi",
          action: {
            fromChainId: 1,
            toChainId: 137,
            fromToken: {
              address: "0xfrom",
              chainId: 1,
              symbol: "USDC",
              decimals: 6,
              name: "USD Coin",
            },
            toToken: {
              address: "0xto",
              chainId: 137,
              symbol: "USDC",
              decimals: 6,
              name: "USD Coin",
            },
            fromAmount: "1000000",
            slippage: 0.005,
            fromAddress: "0xsender",
            toAddress: "0xrecipient",
          },
          estimate: {
            fromAmount: "1000000",
            toAmount: "990000",
            toAmountMin: "980000",
            fromAmountUSD: "1.00",
            toAmountUSD: "0.99",
            gasCosts: [
              {
                type: "SEND",
                amount: "21000",
                amountUSD: "0.10",
                token: {
                  address: "0xeth",
                  chainId: 1,
                  symbol: "ETH",
                  decimals: 18,
                  name: "Ether",
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const result = await getQuote(makeClient(), {
      fromChainId: 1,
      toChainId: 137,
      fromTokenAddress: "0xfrom",
      toTokenAddress: "0xto",
      toAmount: "990000",
      fromAddress: "0xsender",
      toAddress: "0xrecipient",
    });

    expect(calls).toHaveLength(1);
    const call = calls[0];
    if (!call) throw new Error("expected one fetch call");
    expect(call.url.startsWith("https://li.test/v1/quote/toAmount?")).toBe(
      true,
    );
    const queryString = call.url.split("?")[1] ?? "";
    const query = new URLSearchParams(queryString);
    expect(query.get("fromChain")).toBe("1");
    expect(query.get("toChain")).toBe("137");
    expect(query.get("fromToken")).toBe("0xfrom");
    expect(query.get("toToken")).toBe("0xto");
    expect(query.get("toAmount")).toBe("990000");
    expect(query.get("integrator")).toBe("test-integrator");
    expect(query.get("fee")).toBe("0.05");
    expect(query.get("order")).toBe("FASTEST");
    expect(call.init?.method).toBe("GET");
    expect(call.init?.headers).toEqual({ "x-lifi-api-key": "test-key" });

    expect(result.integrator).toBe("test-integrator");
    expect(result.route.id).toBe("step-1");
    expect(result.route.fromAmount).toBe("1000000");
    expect(result.route.toAmount).toBe("990000");
    expect(result.route.gasCostUSD).toBe("0.10");
    expect(result.route.fromAddress).toBe("0xsender");
    expect(result.route.toAddress).toBe("0xrecipient");
    expect(result.route.steps).toHaveLength(1);
  });

  it("throws LifiError on a non-2xx response", async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ message: "bad request" }), {
        status: 400,
      }),
    );

    await expect(
      getQuote(makeClient(), {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: "0xfrom",
        toTokenAddress: "0xto",
        toAmount: "1",
        fromAddress: "0xsender",
        toAddress: "0xrecipient",
      }),
    ).rejects.toMatchObject({
      name: "LifiError",
      message: "bad request",
      statusCode: 400,
    });

    // sanity-check the runtime class
    try {
      await getQuote(makeClient(), {
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: "0xfrom",
        toTokenAddress: "0xto",
        toAmount: "1",
        fromAddress: "0xsender",
        toAddress: "0xrecipient",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(LifiError);
    }
  });
});

describe("getStatus", () => {
  it("returns NOT_FOUND on 404", async () => {
    stubFetch(() => new Response("not found", { status: 404 }));
    const result = await getStatus(makeClient(), "0xtxhash");
    expect(result.status).toBe("NOT_FOUND");
  });

  it("normalises a successful status response", async () => {
    stubFetch(() =>
      new Response(
        JSON.stringify({
          status: "DONE",
          substatus: "COMPLETED",
          substatusMessage: "ok",
          lifiExplorerLink: "https://lifi.test/tx",
          bridgeExplorerLink: "https://bridge.test/tx",
          sending: { txLink: "https://etherscan.test/tx" },
          receiving: { txLink: "https://polygonscan.test/tx" },
        }),
        { status: 200 },
      ),
    );

    const result = await getStatus(makeClient(), "0xtxhash", 1, 137);
    expect(result.status).toBe("DONE");
    expect(result.substatus).toBe("COMPLETED");
    expect(result.error).toBe("ok");
    expect(result.lifiExplorerLink).toBe("https://lifi.test/tx");
    expect(result.bridgeExplorerLink).toBe("https://bridge.test/tx");
    expect(result.sendingTxLink).toBe("https://etherscan.test/tx");
    expect(result.receivingTxLink).toBe("https://polygonscan.test/tx");
  });

  it("falls back to PENDING when fetch throws so worker keeps retrying", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    // suppress the deliberate console.error from the client
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getStatus(makeClient(), "0xtxhash");
    expect(result.status).toBe("PENDING");
    expect(errSpy).toHaveBeenCalled();
  });
});
