import { describe, it, expect } from "vitest";

import {
  createOnrampOrderApiSchema,
  createOnrampOrderValidationSchema,
} from "../schemas";

const baseApiPayload = {
  agreementAcceptedAt: "2025-01-01T00:00:00.000Z",
  destinationAddress: "0xabc",
  destinationNetwork: "base",
  paymentCurrency: "USD",
  purchaseCurrency: "USDC",
  isQuote: false,
  paymentAmount: "100.00",
  purchaseAmount: "100.00",
  isSandbox: true,
};

describe("createOnrampOrderApiSchema", () => {
  it("accepts a well-formed API payload", () => {
    const parsed = createOnrampOrderApiSchema.parse(baseApiPayload);
    expect(parsed.isSandbox).toBe(true);
    expect(parsed.destinationAddress).toBe("0xabc");
  });

  it("rejects when a required field is empty", () => {
    expect(() =>
      createOnrampOrderApiSchema.parse({
        ...baseApiPayload,
        destinationAddress: "",
      }),
    ).toThrow(/destinationAddress is required/);
  });
});

describe("createOnrampOrderValidationSchema", () => {
  it("requires server-attached compliance fields", () => {
    const { isSandbox: _omit, ...rest } = baseApiPayload;
    void _omit;
    const result = createOnrampOrderValidationSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(
        expect.arrayContaining([
          "email",
          "partnerUserRef",
          "phoneNumber",
          "phoneNumberVerifiedAt",
        ]),
      );
    }
  });

  it("accepts a fully-populated validation payload", () => {
    const { isSandbox: _omit, ...rest } = baseApiPayload;
    void _omit;
    const parsed = createOnrampOrderValidationSchema.parse({
      ...rest,
      email: "demo@example.com",
      partnerUserRef: "user-123",
      phoneNumber: "+12345678901",
      phoneNumberVerifiedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(parsed.email).toBe("demo@example.com");
  });
});
