import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { signRequest } from "../auth";

describe("signRequest", () => {
  const APP_TOKEN = "sbx:test_token";
  const SECRET_KEY = "test_secret_key";

  it("returns all four required headers", () => {
    const headers = signRequest(APP_TOKEN, SECRET_KEY, "GET", "/resources/applicants");
    expect(headers["X-App-Token"]).toBe(APP_TOKEN);
    expect(headers["X-App-Access-Ts"]).toMatch(/^\d+$/);
    expect(headers["X-App-Access-Sig"]).toMatch(/^[0-9a-f]+$/);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("produces a valid HMAC-SHA256 signature for GET without body", () => {
    const headers = signRequest(APP_TOKEN, SECRET_KEY, "GET", "/resources/applicants");
    const ts = headers["X-App-Access-Ts"];
    const signingString = `${ts}GET/resources/applicants`;
    const expected = createHmac("sha256", SECRET_KEY)
      .update(signingString)
      .digest("hex");
    expect(headers["X-App-Access-Sig"]).toBe(expected);
  });

  it("includes body in signing string for POST", () => {
    const body = JSON.stringify({ externalUserId: "user_1" });
    const headers = signRequest(APP_TOKEN, SECRET_KEY, "POST", "/resources/applicants?levelName=basic", body);
    const ts = headers["X-App-Access-Ts"];
    const signingString = `${ts}POST/resources/applicants?levelName=basic${body}`;
    const expected = createHmac("sha256", SECRET_KEY)
      .update(signingString)
      .digest("hex");
    expect(headers["X-App-Access-Sig"]).toBe(expected);
  });

  it("uppercases the HTTP method", () => {
    const h1 = signRequest(APP_TOKEN, SECRET_KEY, "get", "/test");
    const h2 = signRequest(APP_TOKEN, SECRET_KEY, "GET", "/test");
    // Same timestamp would produce same sig; different runs may differ.
    // Just verify the method is uppercased by checking sig computation.
    const ts = h1["X-App-Access-Ts"];
    const signingString = `${ts}GET/test`;
    const expected = createHmac("sha256", SECRET_KEY)
      .update(signingString)
      .digest("hex");
    expect(h1["X-App-Access-Sig"]).toBe(expected);
  });
});
