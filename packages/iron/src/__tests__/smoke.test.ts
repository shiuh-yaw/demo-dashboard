/**
 * Smoke test — public exports compile and resolve as expected.
 */
import { describe, it, expect } from "vitest";
import * as Iron from "../index";

describe("@dynamic-demos/iron — public surface", () => {
  it("exports client factory + class + mock", () => {
    expect(typeof Iron.createIronClient).toBe("function");
    expect(typeof Iron.IronFinanceClient).toBe("function");
    expect(typeof Iron.MockIronClient).toBe("function");
  });

  it("exports env resolvers and defaults to sandbox", () => {
    expect(Iron.resolveIronEnvironment()).toBe("sandbox");
    expect(Iron.resolveIronEnvironment("production")).toBe("production");
    expect(Iron.resolveIronBaseUrl("sandbox")).toBe(
      "https://api.sandbox.iron.xyz",
    );
    expect(Iron.resolveIronBaseUrl("production")).toBe("https://api.iron.xyz");
  });

  it("exports state mappers and webhook helpers", () => {
    expect(typeof Iron.rampStatusToCanonical).toBe("function");
    expect(typeof Iron.ironAutorampStatusToCanonical).toBe("function");
    expect(typeof Iron.verifyIronSignature).toBe("function");
    expect(typeof Iron.normalizeIronEvent).toBe("function");
    expect(Iron.IRON_SIGNATURE_HEADER).toBe("x-iron-signature");
  });
});

describe("createIronClient — sandbox by default", () => {
  it("constructs with no options and resolves to sandbox", () => {
    const client = Iron.createIronClient({ apiKey: "test" });
    expect(client.isSandbox()).toBe(true);
  });

  it("respects explicit production override", () => {
    const client = Iron.createIronClient({
      env: "production",
      apiKey: "test",
    });
    expect(client.isSandbox()).toBe(false);
  });
});
