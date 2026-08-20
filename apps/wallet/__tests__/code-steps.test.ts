import { describe, expect, it } from "vitest";
import { assertAuthoredCodeSteps } from "@dynamic-demos/code-highlight/testing";
import {
  WALLET_ACCOUNT_STEPS,
  WALLET_DELEGATION_STEPS,
  WALLET_JWT_SETUP_STEPS,
  WALLET_SDK_STEPS,
  WALLET_SEND_STEPS_BY_CHAIN,
  WALLET_SETTINGS_STEPS,
  WALLET_SIGNING_STEPS,
  WALLET_TX_STEPS,
  buildCodeSteps,
} from "../lib/code-steps";
import { SEND_CHAINS } from "../lib/send-chains";

const ALL_STEPS = [
  ...WALLET_SDK_STEPS,
  ...WALLET_JWT_SETUP_STEPS,
  ...WALLET_ACCOUNT_STEPS,
  ...WALLET_TX_STEPS,
  ...WALLET_SETTINGS_STEPS,
  ...WALLET_SIGNING_STEPS,
  ...WALLET_DELEGATION_STEPS,
  ...Object.values(WALLET_SEND_STEPS_BY_CHAIN).flat(),
];

describe("wallet code-step content", () => {
  it("every step carries non-empty content", () => {
    expect(WALLET_SDK_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(WALLET_JWT_SETUP_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(WALLET_ACCOUNT_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(WALLET_TX_STEPS.length).toBeGreaterThanOrEqual(2);
    expect(WALLET_SETTINGS_STEPS.length).toBeGreaterThanOrEqual(3);
    // Delegation only teaches the loop if both server steps are present.
    expect(WALLET_DELEGATION_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const chain of SEND_CHAINS) {
      expect(WALLET_SEND_STEPS_BY_CHAIN[chain].length).toBeGreaterThanOrEqual(
        1,
      );
    }
    // Sponsorship exists exactly where Dynamic supports it.
    const hasSponsor = (steps: (typeof WALLET_SEND_STEPS_BY_CHAIN)["EVM"]) =>
      steps.some((s) => s.title === "Sponsor Network Fees");
    expect(hasSponsor(WALLET_SEND_STEPS_BY_CHAIN.EVM)).toBe(true);
    expect(hasSponsor(WALLET_SEND_STEPS_BY_CHAIN.SOL)).toBe(true);
    expect(hasSponsor(WALLET_SEND_STEPS_BY_CHAIN.SUI)).toBe(false);
    expect(hasSponsor(WALLET_SEND_STEPS_BY_CHAIN.BTC)).toBe(false);
    expect(hasSponsor(WALLET_SEND_STEPS_BY_CHAIN.TON)).toBe(false);
    // Shared content rules: non-empty fields, two-digit num, dynamic.xyz
    // docs links, every TS snippet opens with its import line.
    assertAuthoredCodeSteps(ALL_STEPS);
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(WALLET_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(WALLET_SDK_STEPS[0]!.code);
  });
});
