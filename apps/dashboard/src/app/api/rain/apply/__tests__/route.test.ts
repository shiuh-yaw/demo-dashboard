import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

// The real (unmocked) route export types require a NextRequest + a
// RouteContext second arg; the mocked withAuth below ignores both, but tsc
// still checks calls against the real module's types.
const routeContext = { params: Promise.resolve({}) };

const { stubUser, rainClient } = vi.hoisted(() => ({
  stubUser: {
    sub: "user-sub",
    email: "user@example.com",
    verified_credentials: [
      { wallet_provider: "embeddedWallet", address: "0xWallet" },
    ],
  } as {
    sub: string;
    email?: string;
    verified_credentials?: Array<{ wallet_provider?: string; address?: string }>;
  },
  rainClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("@/lib/dynamic/dynamic-auth", () => ({
  withAuth:
    (handler: (req: Request, ctx: { user: unknown }) => unknown) =>
    (req: Request) =>
      handler(req, { user: stubUser }),
}));

vi.mock("@/lib/rain/client", () => ({ getRainClient: () => rainClient }));

beforeEach(() => {
  rainClient.post.mockReset();
  stubUser.email = "user@example.com";
  stubUser.verified_credentials = [
    { wallet_provider: "embeddedWallet", address: "0xWallet" },
  ];
});

const applyBody = {
  firstName: "Ada",
  birthDate: "1990-01-01",
  nationalId: "123-45-6789",
  phoneNumber: "5551234567",
  address: {
    line1: "1 St",
    city: "NYC",
    region: "NY",
    postalCode: "10001",
    countryCode: "US",
  },
  occupation: "engineer",
  annualSalary: "100000",
  accountPurpose: "personal",
  expectedMonthlyVolume: "1000",
  isTermsOfServiceAccepted: true,
};

describe("/api/rain/apply", () => {
  it("creates an application then a card and returns the card", async () => {
    rainClient.post
      .mockResolvedValueOnce({ id: "rapp_1" })
      .mockResolvedValueOnce({ id: "rcard_1", userId: "rapp_1", last4: "4242" });
    const { POST } = await import("../route");

    const res = await POST(
      new NextRequest("http://localhost/api/rain/apply", {
        method: "POST",
        body: JSON.stringify(applyBody),
      }),
      routeContext,
    );
    const body = await res.json();

    expect(rainClient.post).toHaveBeenNthCalledWith(
      1,
      "/v1/issuing/applications/user",
      expect.objectContaining({ email: "user@example.com", walletAddress: "0xWallet" }),
    );
    expect(rainClient.post).toHaveBeenNthCalledWith(
      2,
      "/v1/issuing/users/rapp_1/cards",
      expect.objectContaining({ type: "virtual" }),
    );
    expect(res.status).toBe(200);
    expect(body.data.card.id).toBe("rcard_1");
  });

  it("400s when the user has no embedded wallet", async () => {
    stubUser.verified_credentials = [];
    const { POST } = await import("../route");
    const res = await POST(
      new NextRequest("http://localhost/api/rain/apply", {
        method: "POST",
        body: JSON.stringify(applyBody),
      }),
      routeContext,
    );
    expect(res.status).toBe(400);
  });
});
