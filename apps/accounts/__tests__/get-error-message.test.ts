import { describe, expect, it } from "vitest";
import { getErrorMessage, parseError } from "../lib/get-error-message";

/** An `APIError`-shaped throw, read structurally rather than by instanceof. */
function apiError(
  status: number,
  message = "",
  code = "api_error",
): Error & { status: number; code: string } {
  return Object.assign(new Error(message), { status, code });
}

describe("parseError - status-driven", () => {
  it("names both causes for a 403 and keeps the code", () => {
    const parsed = parseError(apiError(403, "", "forbidden"));
    expect(parsed.title).toBe("Not permitted on this environment");
    expect(parsed.description).toContain("enable-business-accounts");
    expect(parsed.description).toContain("(forbidden)");
  });

  it("prefers the server's own words on a 403 when it gave any", () => {
    const parsed = parseError(
      apiError(403, "caller is not an owner", "not_owner"),
    );
    expect(parsed.description).toContain("caller is not an owner");
    expect(parsed.description).toContain("(not_owner)");
  });

  it("reads a 404 as not-a-member rather than leaking existence", () => {
    expect(parseError(apiError(404)).title).toBe("Account not found");
  });

  it("treats a 409 as a state conflict and surfaces the server text", () => {
    const parsed = parseError(apiError(409, "wallet would have no signers"));
    expect(parsed.title).toMatch(/current state/i);
    expect(parsed.description).toContain("wallet would have no signers");
  });

  it("recognizes a rejected session by code, with no status", () => {
    // The SDK throws this one as `code: "unauthorized_error"` with no HTTP
    // status, so the status switch never sees it - it used to fall through and
    // render the bare word "Unauthorized".
    const parsed = parseError({
      code: "unauthorized_error",
      message: "Unauthorized",
    });
    expect(parsed.title).toBe("Session not accepted");
    expect(parsed.description).toContain("different Dynamic environment");
    expect(parsed.description).toContain("(unauthorized_error)");
  });

  it("handles 401, 422, 429 and 5xx", () => {
    expect(parseError(apiError(401)).title).toBe("Session not accepted");
    expect(parseError(apiError(422, "bad identifier")).title).toBe(
      "Request rejected",
    );
    expect(parseError(apiError(429)).title).toBe("Too many attempts");
    expect(parseError(apiError(503)).title).toBe("Dynamic API error");
  });
});

describe("parseError - recognized conditions", () => {
  it("translates a missing elevated token into the step-up instruction", () => {
    const parsed = parseError(new Error("Elevated access token required"));
    expect(parsed.title).toBe("Verification needed");
    expect(parsed.description).toMatch(/verification prompt/i);
  });

  it("matches on the error code, not only the message", () => {
    const parsed = parseError(
      apiError(403, "", "elevated_access_token_required"),
    );
    expect(parsed.title).toBe("Verification needed");
  });

  it("explains the last-signer guard", () => {
    expect(
      parseError(apiError(409, "would leave the wallet with zero active signers"))
        .title,
    ).toMatch(/last signer/i);
  });

  it("explains the last-wallet guard", () => {
    expect(parseError(new Error("cannot remove the last wallet")).title).toMatch(
      /last wallet/i,
    );
  });

  it("reports a declined step-up as a cancellation, not a failure", () => {
    expect(parseError(new Error("Verification cancelled")).title).toBe(
      "Cancelled",
    );
  });
});

describe("parseError - never swallows the server's explanation", () => {
  it("shows an unrecognized message verbatim instead of a generic string", () => {
    const parsed = parseError(new Error("Business accounts are not available"));
    expect(parsed.title).toBe("Business accounts are not available");
    expect(parsed.title).not.toBe("Something went wrong. Please try again.");
  });

  it("appends the code to an unrecognized message", () => {
    expect(parseError(apiError(0, "odd failure", "weird_code")).description).toBe(
      "(weird_code)",
    );
  });

  it("reads BaseError's shortMessage when message is unhelpful", () => {
    const err = Object.assign(new Error(""), {
      shortMessage: "Signer already exists on this wallet",
    });
    expect(parseError(err).title).toBe("Signer already exists on this wallet");
  });

  it("truncates a long technical message but keeps the code", () => {
    const parsed = parseError(apiError(0, "x".repeat(400), "long"));
    expect(parsed.title).toBe("Request failed");
    expect(parsed.description).toContain("(long)");
  });

  it("falls back to the generic string only when there is no text at all", () => {
    expect(parseError({ nope: true }).title).toBe(
      "Something went wrong. Please try again.",
    );
    expect(parseError({ nope: true }, "Fallback").title).toBe("Fallback");
  });

  it("returns an empty title for no error, so callers render nothing", () => {
    expect(parseError(null).title).toBe("");
    expect(parseError(undefined).title).toBe("");
  });

  it("accepts a bare string throw", () => {
    expect(parseError("plain failure").title).toBe("plain failure");
  });
});

describe("getErrorMessage", () => {
  it("flattens title and description onto one line", () => {
    expect(getErrorMessage(new Error("Elevated access token required"))).toMatch(
      /^Verification needed: /,
    );
  });
});
