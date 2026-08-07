import { describe, expect, it } from "vitest";
import {
  buildTargetIdentity,
  emptyIdentityInput,
  identityInputError,
  IDENTIFY_BY,
  IDENTIFY_BY_LABELS,
  IDENTIFY_BY_PLACEHOLDERS,
} from "../lib/business-accounts/identity";

describe("identityInputError", () => {
  it("requires a value", () => {
    expect(identityInputError({ identifyBy: "email", value: "  " })).toMatch(
      /identifier/i,
    );
    expect(identityInputError({ identifyBy: "userId", value: "" })).toMatch(
      /user ID/i,
    );
  });

  it("rejects a malformed email", () => {
    expect(
      identityInputError({ identifyBy: "email", value: "not-an-email" }),
    ).toMatch(/valid email/i);
    expect(
      identityInputError({ identifyBy: "email", value: "cfo@acme.example" }),
    ).toBeNull();
  });

  it("requires a provider for the social identifier types", () => {
    for (const identifyBy of ["socialUsername", "socialAccountId"] as const) {
      expect(identityInputError({ identifyBy, value: "someone" })).toMatch(
        /social provider/i,
      );
      expect(
        identityInputError({
          identifyBy,
          value: "someone",
          socialProvider: "google",
        }),
      ).toBeNull();
    }
  });

  it("requires both phone codes together", () => {
    expect(
      identityInputError({
        identifyBy: "phoneNumber",
        value: "+15550100",
        isoCountryCode: "US",
      }),
    ).toMatch(/dial code/i);
    expect(
      identityInputError({
        identifyBy: "phoneNumber",
        value: "+15550100",
        isoCountryCode: "US",
        phoneCountryCode: "1",
      }),
    ).toBeNull();
  });
});

describe("buildTargetIdentity", () => {
  it("maps userId to the alternative branch, never an identifierType", () => {
    expect(
      buildTargetIdentity({ identifyBy: "userId", value: " user-123 " }),
    ).toEqual({ userId: "user-123" });
  });

  it("maps a plain identifier to identifier + identifierType", () => {
    expect(
      buildTargetIdentity({ identifyBy: "email", value: "cfo@acme.example" }),
    ).toEqual({
      identifier: "cfo@acme.example",
      identifierType: "email",
    });
    expect(
      buildTargetIdentity({ identifyBy: "externalUserId", value: "ext-9" }),
    ).toEqual({ identifier: "ext-9", identifierType: "externalUserId" });
  });

  it("carries the social provider for social identifier types", () => {
    expect(
      buildTargetIdentity({
        identifyBy: "socialUsername",
        value: "acmecfo",
        socialProvider: " google ",
      }),
    ).toEqual({
      identifier: "acmecfo",
      identifierType: "socialUsername",
      socialProvider: "google",
    });
  });

  it("carries both SMS country codes for a phone number", () => {
    expect(
      buildTargetIdentity({
        identifyBy: "phoneNumber",
        value: "+15550100",
        isoCountryCode: "US",
        phoneCountryCode: "1",
      }),
    ).toEqual({
      identifier: "+15550100",
      identifierType: "phoneNumber",
      smsCountryCode: { isoCountryCode: "US", phoneCountryCode: "1" },
    });
  });

  it("throws rather than emitting a half-built identity", () => {
    expect(() =>
      buildTargetIdentity({ identifyBy: "email", value: "nope" }),
    ).toThrow(/valid email/i);
  });
});

describe("IDENTIFY_BY", () => {
  it("has a label and a placeholder for every option", () => {
    for (const option of IDENTIFY_BY) {
      expect(IDENTIFY_BY_LABELS[option]).toBeTruthy();
      expect(IDENTIFY_BY_PLACEHOLDERS[option]).toBeTruthy();
    }
  });

  it("defaults a blank input to email", () => {
    expect(emptyIdentityInput()).toEqual({ identifyBy: "email", value: "" });
  });
});
