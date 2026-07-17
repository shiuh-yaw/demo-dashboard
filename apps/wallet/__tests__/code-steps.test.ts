import { describe, expect, it } from "vitest";
import {
  WALLET_ACCOUNT_STEPS,
  WALLET_JWT_SETUP_STEPS,
  WALLET_SDK_STEPS,
  WALLET_SEND_STEPS_BY_CHAIN,
  WALLET_SETTINGS_STEPS,
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
  ...Object.values(WALLET_SEND_STEPS_BY_CHAIN).flat(),
];

describe("wallet code-step content", () => {
  it("every step carries non-empty content", () => {
    expect(WALLET_SDK_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(WALLET_JWT_SETUP_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(WALLET_ACCOUNT_STEPS.length).toBeGreaterThanOrEqual(3);
    expect(WALLET_TX_STEPS.length).toBeGreaterThanOrEqual(2);
    expect(WALLET_SETTINGS_STEPS.length).toBeGreaterThanOrEqual(3);
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
    // Every snippet ships its import line (bash config blocks excepted).
    for (const step of ALL_STEPS) {
      if (step.lang === "typescript") {
        expect(step.code, `${step.title} is missing its import`).toMatch(
          /^import /,
        );
      }
    }
    for (const step of ALL_STEPS) {
      expect(step.num).toMatch(/^\d\d$/);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.prose.length).toBeGreaterThan(0);
      expect(step.filename.length).toBeGreaterThan(0);
      expect(step.code.trim().length).toBeGreaterThan(0);
    }
  });

  it("docs URLs point at dynamic.xyz docs", () => {
    for (const step of ALL_STEPS) {
      expect(step.docsUrl).toMatch(/^https:\/\/(www\.)?dynamic\.xyz\/docs\//);
    }
  });

  it("buildCodeSteps produces highlighted HTML for every step", async () => {
    const steps = await buildCodeSteps(WALLET_SDK_STEPS.slice(0, 1));
    expect(steps[0]!.html).toContain("shiki");
    expect(steps[0]!.rawCode).toBe(WALLET_SDK_STEPS[0]!.code);
  });
});
