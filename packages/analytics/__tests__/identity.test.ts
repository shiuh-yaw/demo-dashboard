import { describe, it, expect } from "vitest";
import { resolveUserEmail, resolveUserIdentity } from "../src/identity";

describe("resolveUserEmail", () => {
  it("prefers the top-level email (email-OTP / settled social path)", () => {
    expect(resolveUserEmail({ email: "otp@b.co" })).toBe("otp@b.co");
  });

  it("falls back to a verified credential email", () => {
    expect(
      resolveUserEmail({
        email: null,
        verifiedCredentials: [{ format: "email", email: "cred@b.co" }],
      }),
    ).toBe("cred@b.co");
  });

  it("falls back to an oauth credential's oauthEmails", () => {
    expect(
      resolveUserEmail({
        email: null,
        verifiedCredentials: [{ format: "oauth", oauthEmails: ["g@b.co"] }],
      }),
    ).toBe("g@b.co");
  });

  it("falls back to an email-shaped publicIdentifier", () => {
    expect(
      resolveUserEmail({ verifiedCredentials: [{ publicIdentifier: "pub@b.co" }] }),
    ).toBe("pub@b.co");
  });

  it("ignores non-email values and returns undefined when nothing matches", () => {
    expect(resolveUserEmail({ email: "" })).toBeUndefined();
    expect(
      resolveUserEmail({
        verifiedCredentials: [
          { publicIdentifier: "0xabc" },
          { oauthEmails: ["not-an-email"] },
        ],
      }),
    ).toBeUndefined();
    expect(resolveUserEmail(null)).toBeUndefined();
    expect(resolveUserEmail(undefined)).toBeUndefined();
  });
});

describe("resolveUserIdentity", () => {
  it("returns null until the user has an id", () => {
    expect(resolveUserIdentity(null)).toBeNull();
    expect(resolveUserIdentity(undefined)).toBeNull();
    expect(resolveUserIdentity({ email: "a@b.co" })).toBeNull();
  });

  it("carries the dynamic user id and top-level email", () => {
    expect(resolveUserIdentity({ id: "u_1", email: "a@b.co" })).toEqual({
      dynamicUserId: "u_1",
      email: "a@b.co",
    });
  });

  it("resolves the email from a social verified credential", () => {
    expect(
      resolveUserIdentity({
        id: "u_1",
        email: null,
        verifiedCredentials: [{ format: "oauth", oauthEmails: ["g@b.co"] }],
      }),
    ).toEqual({ dynamicUserId: "u_1", email: "g@b.co" });
  });

  it("omits email when absent or null", () => {
    expect(resolveUserIdentity({ id: "u_1" })).toEqual({ dynamicUserId: "u_1" });
    expect(resolveUserIdentity({ id: "u_1", email: null })).toEqual({
      dynamicUserId: "u_1",
    });
  });
});
