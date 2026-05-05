import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  CoinbaseError,
  createCoinbaseOnrampClient,
  createOnrampOrder,
} from "../client";

// Stub @coinbase/cdp-sdk/auth so tests don't need real credentials and
// don't perform any cryptographic work. Each test gets a deterministic
// JWT-shaped string.
vi.mock("@coinbase/cdp-sdk/auth", () => ({
  generateJwt: vi.fn(async () => "test-jwt-token"),
}));

const validParams = {
  agreementAcceptedAt: "2025-01-01T00:00:00.000Z",
  destinationAddress: "0xabc",
  destinationNetwork: "base",
  paymentCurrency: "USD",
  purchaseCurrency: "USDC",
  isQuote: false,
  paymentAmount: "100.00",
  purchaseAmount: "100.00",
  email: "demo@example.com",
  partnerUserRef: "user-123",
  phoneNumber: "+12345678901",
  phoneNumberVerifiedAt: "2025-01-01T00:00:00.000Z",
};

const successPayload = {
  order: {
    createdAt: "2025-01-01T00:00:00.000Z",
    destinationAddress: "0xabc",
    destinationNetwork: "base",
    exchangeRate: "1",
    fees: [{ type: "network", amount: "0.10", currency: "USD" }],
    orderId: "order-1",
    paymentCurrency: "USD",
    paymentMethod: "GUEST_CHECKOUT_APPLE_PAY",
    paymentSubtotal: "100.00",
    paymentTotal: "100.10",
    purchaseAmount: "100.00",
    purchaseCurrency: "USDC",
    status: "pending",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  paymentLink: {
    url: "https://pay.coinbase.com/test-checkout",
    paymentLinkType: "applePay",
  },
};

const originalApiKey = process.env.COINBASE_API_KEY;
const originalApiSecret = process.env.COINBASE_API_SECRET;

beforeEach(() => {
  process.env.COINBASE_API_KEY = "test-key";
  process.env.COINBASE_API_SECRET = "test-secret";
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.COINBASE_API_KEY;
  else process.env.COINBASE_API_KEY = originalApiKey;
  if (originalApiSecret === undefined) delete process.env.COINBASE_API_SECRET;
  else process.env.COINBASE_API_SECRET = originalApiSecret;
});

describe("createCoinbaseOnrampClient", () => {
  it("defaults to sandbox", () => {
    const client = createCoinbaseOnrampClient({});
    expect(client.env).toBe("sandbox");
    expect(client.endpoint.isSandbox).toBe(true);
    expect(client.endpoint.host).toBe("api.cdp.coinbase.com");
  });

  it("respects an explicit production environment", () => {
    const client = createCoinbaseOnrampClient({ env: "production" });
    expect(client.env).toBe("production");
    expect(client.endpoint.isSandbox).toBe(false);
  });

  it("throws CoinbaseError when credentials are missing", () => {
    delete process.env.COINBASE_API_KEY;
    delete process.env.COINBASE_API_SECRET;
    expect(() => createCoinbaseOnrampClient({})).toThrow(CoinbaseError);
  });
});

describe("createOnrampOrder", () => {
  it("issues a POST against /platform/v2/onramp/orders and normalizes the response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createCoinbaseOnrampClient({
      env: "sandbox",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await createOnrampOrder(client, validParams);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as
      | [string, RequestInit]
      | undefined;
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(url).toBe(
      "https://api.cdp.coinbase.com/platform/v2/onramp/orders",
    );
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.paymentMethod).toBe("GUEST_CHECKOUT_APPLE_PAY");
    expect(body.destinationAddress).toBe(validParams.destinationAddress);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-jwt-token",
    );

    expect(result.id).toBe("order-1");
    expect(result.paymentUrl).toBe("https://pay.coinbase.com/test-checkout");
    expect(result.status).toBe("pending");
    expect(result.orderDetails.orderId).toBe("order-1");
  });

  it("throws CoinbaseError with the upstream status on a non-2xx response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "bad request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createCoinbaseOnrampClient({
      env: "sandbox",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(createOnrampOrder(client, validParams)).rejects.toMatchObject({
      name: "CoinbaseError",
      statusCode: 400,
    });
  });

  it("throws CoinbaseError when Coinbase returns a malformed payload", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ order: null, paymentLink: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createCoinbaseOnrampClient({
      env: "sandbox",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(createOnrampOrder(client, validParams)).rejects.toThrow(
      /Missing order or paymentLink/,
    );
  });
});
