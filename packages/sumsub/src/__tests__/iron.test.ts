import { describe, expect, it } from "vitest";
import {
  buildIronTokenIdentification,
  requiresUserAction,
  type IronTokenIdentificationResponse,
} from "../iron";

describe("buildIronTokenIdentification", () => {
  it("builds a Token identification request with required fields", () => {
    const result = buildIronTokenIdentification({
      token: "share_token_abc",
      intended_use: "PurchaseDigitalAssets",
    });

    expect(result).toEqual({
      type: "Token",
      token: "share_token_abc",
      intended_use: "PurchaseDigitalAssets",
    });
  });

  it("includes ip_address when provided", () => {
    const result = buildIronTokenIdentification({
      token: "share_token_abc",
      intended_use: "Trading",
      ip_address: "192.168.1.1",
    });

    expect(result).toEqual({
      type: "Token",
      token: "share_token_abc",
      intended_use: "Trading",
      ip_address: "192.168.1.1",
    });
  });

  it("omits ip_address when not provided", () => {
    const result = buildIronTokenIdentification({
      token: "t",
      intended_use: "Investing",
    });

    expect(result).not.toHaveProperty("ip_address");
  });

  it("always sets type to Token", () => {
    const result = buildIronTokenIdentification({
      token: "any",
      intended_use: "OnlinePurchasesOfGoodsOrServices",
    });

    expect(result.type).toBe("Token");
  });
});

describe("requiresUserAction", () => {
  it("returns true when status is Pending with a URL", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_1",
      status: "Pending",
      url: "https://iron.xyz/complete-kyc",
    };
    expect(requiresUserAction(response)).toBe(true);
  });

  it("returns false when status is Pending without a URL", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_2",
      status: "Pending",
    };
    expect(requiresUserAction(response)).toBe(false);
  });

  it("returns false when status is Pending with null URL (JSON null)", () => {
    const response = {
      id: "ident_2b",
      status: "Pending",
      url: null,
    } as unknown as IronTokenIdentificationResponse;
    expect(requiresUserAction(response)).toBe(false);
  });

  it("returns false when status is Pending with empty string URL", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_2c",
      status: "Pending",
      url: "",
    };
    expect(requiresUserAction(response)).toBe(false);
  });

  it("returns false when status is Approved", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_3",
      status: "Approved",
    };
    expect(requiresUserAction(response)).toBe(false);
  });

  it("returns false when status is Processed", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_4",
      status: "Processed",
    };
    expect(requiresUserAction(response)).toBe(false);
  });

  it("returns false when status is Rejected", () => {
    const response: IronTokenIdentificationResponse = {
      id: "ident_5",
      status: "Rejected",
    };
    expect(requiresUserAction(response)).toBe(false);
  });
});
