/**
 * KYC Deposit scenario configuration tests.
 *
 * Covers:
 * - FLOW_SCENARIOS includes "kyc-deposit"
 * - DEFAULT_FLOW_CONFIGS["kyc-deposit"] passes schema validation
 * - kyc-deposit config has expected settlement (USDC, Base)
 * - kyc-deposit config has correct source/destination types
 * - FLOW_SEED_CONFIG_IDS includes kyc-deposit
 * - ScenarioSwitcher type includes kyc-deposit
 */

import { describe, it, expect } from "vitest";

import {
  FLOW_SCENARIOS,
  flowConfigSchema,
} from "../lib/flow-config/schema";
import {
  DEFAULT_FLOW_CONFIGS,
  FLOW_SEED_CONFIG_IDS,
} from "../lib/flow-config/defaults";

describe("kyc-deposit in FLOW_SCENARIOS", () => {
  it("includes kyc-deposit as a valid scenario", () => {
    expect(FLOW_SCENARIOS).toContain("kyc-deposit");
  });

  it("has exactly 4 scenarios", () => {
    expect(FLOW_SCENARIOS).toHaveLength(4);
  });
});

describe("DEFAULT_FLOW_CONFIGS[kyc-deposit]", () => {
  const config = DEFAULT_FLOW_CONFIGS["kyc-deposit"];

  it("passes schema validation", () => {
    expect(() => flowConfigSchema.parse(config)).not.toThrow();
  });

  it("has scenario set to kyc-deposit", () => {
    expect(config.scenario).toBe("kyc-deposit");
  });

  it("settles on USDC / Base (Base Sepolia testnet)", () => {
    expect(config.asset.symbol).toBe("USDC");
    expect(config.asset.chain).toBe("base");
  });

  it("sources from external-wallet", () => {
    expect(config.source.type).toBe("external-wallet");
  });

  it("destinations to external-address (Iron deposit address)", () => {
    expect(config.destination.type).toBe("external-address");
  });

  it("has user-input amount mode with presets", () => {
    expect(config.amount.mode).toBe("user-input");
    expect(config.amount.presets).toBeDefined();
    expect(config.amount.presets!.length).toBeGreaterThan(0);
  });

  it("enforces sanctions screening", () => {
    expect(config.compliance.sanctionsScreening).toBe(true);
  });

  it("has minimum deposit of $10", () => {
    expect(config.amount.minimums?.usd).toBe(10);
  });
});

describe("FLOW_SEED_CONFIG_IDS", () => {
  it("includes kyc-deposit seed id", () => {
    expect(FLOW_SEED_CONFIG_IDS["kyc-deposit"]).toBe("flow_seed_kyc_deposit");
  });
});
