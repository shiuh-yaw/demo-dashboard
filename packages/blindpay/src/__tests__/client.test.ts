/**
 * Contract tests for the BlindPay REST client.
 *
 * These intercept `fetch` to verify each public method emits the right
 * URL, headers, and body, and reads the response correctly. No network.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBlindpayClient } from "../client";

interface FetchCall {
  url: string;
  init: RequestInit;
}

function makeFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const call: FetchCall = { url, init: init ?? {} };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createBlindpayClient", () => {
  const baseOptions = {
    env: "sandbox" as const,
    instanceId: "in_test",
    apiKey: "sk_test",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createPayoutQuote POSTs to /quotes with the canonical body", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        id: "quote_1",
        quote_id: "quote_1",
        request_amount: 10000,
        receiver_amount: 9950,
        fee: 50,
        network: "base_sepolia",
        token: "USDC",
      }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    const response = await client.createPayoutQuote({
      bank_account_id: "ba_test",
      currency_type: "sender",
      cover_fees: false,
      request_amount: 10000,
      network: "base_sepolia",
      token: "USDC",
    });

    expect(response.id).toBe("quote_1");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/quotes",
    );
    expect(calls[0]!.init.method).toBe("POST");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      bank_account_id: "ba_test",
      currency_type: "sender",
      cover_fees: false,
      request_amount: 10000,
      network: "base_sepolia",
      token: "USDC",
    });
  });

  it("executePayout POSTs to /payouts/evm", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ id: "po_1", status: "processing" }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    await client.executePayout({
      quote_id: "quote_1",
      sender_wallet_address: "0xabc",
    });

    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/payouts/evm",
    );
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      quote_id: "quote_1",
      sender_wallet_address: "0xabc",
    });
  });

  it("getPayoutStatus GETs /payouts/:id", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ id: "po_1", status: "completed" }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    const result = await client.getPayoutStatus("po_1");

    expect(result.status).toBe("completed");
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/payouts/po_1",
    );
  });

  it("createPayinQuote POSTs to /payin-quotes", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        id: "pq_1",
        payin_quote_id: "pq_1",
        request_amount: 10000,
        receiver_amount: 9950,
        fee: 50,
        token: "USDC",
      }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    await client.createPayinQuote({
      blockchain_wallet_id: "bw_1",
      currency_type: "sender",
      cover_fees: false,
      request_amount: 10000,
      payment_method: "ach",
      token: "USDC",
    });

    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/payin-quotes",
    );
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      blockchain_wallet_id: "bw_1",
      currency_type: "sender",
      cover_fees: false,
      request_amount: 10000,
      payment_method: "ach",
      token: "USDC",
    });
  });

  it("executePayin POSTs to /payins/evm", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ id: "pi_1", status: "processing" }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    await client.executePayin({ payin_quote_id: "pq_1" });

    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/payins/evm",
    );
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      payin_quote_id: "pq_1",
    });
  });

  it("getPayinStatus GETs /payins/:id", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ id: "pi_1", status: "completed" }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    const result = await client.getPayinStatus("pi_1");

    expect(result.status).toBe("completed");
    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/payins/pi_1",
    );
  });

  it("getRates uses /quotes/fx and shapes the response", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        result_amount: 998,
        blindpay_quotation: 99.8,
        commercial_quotation: 100,
        instance_flat_fee: 0,
        instance_percentage_fee: 0.2,
      }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    const rates = await client.getRates({
      from: "USDC",
      to: "USD",
      amount: 1000,
      currency_type: "sender",
    });

    expect(calls[0]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/quotes/fx",
    );
    expect(rates.quote_type).toBe("fx");
    expect(rates.result_amount).toBe(998);
    expect(rates.rate).toBeCloseTo(0.998);
    expect(rates.timestamp).toBe(Date.now());
  });

  it("getRates falls back to /quotes when FX returns 402 with bank account + network", async () => {
    let firstCall = true;
    const { fetchImpl, calls } = makeFetch(() => {
      if (firstCall) {
        firstCall = false;
        return new Response("Payment Required", { status: 402 });
      }
      return jsonResponse({ id: "full_quote_1" });
    });
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    const rates = await client.getRates({
      from: "USDC",
      to: "BRL",
      amount: 1000,
      currency_type: "sender",
      bank_account_id: "ba_test",
      network: "base",
      cover_fees: true,
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]!.url).toBe(
      "https://api.blindpay.com/v1/instances/in_test/quotes",
    );
    expect(rates.quote_type).toBe("full");
    expect(rates.rate).toBe(1);
  });

  it("throws with status + body when an endpoint returns non-OK", async () => {
    const { fetchImpl } = makeFetch(
      () => new Response("nope", { status: 500 }),
    );
    const client = createBlindpayClient({ ...baseOptions, fetchImpl });

    await expect(
      client.executePayout({
        quote_id: "quote_1",
        sender_wallet_address: "0xabc",
      }),
    ).rejects.toThrow(/payout execution failed: 500 - nope/);
  });
});
