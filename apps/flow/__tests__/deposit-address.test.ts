/**
 * Deposit-address source catalog + flow-state classifier guards.
 *
 * The catalog's fromChainId values live in Dynamic's chain-id
 * namespace ('1' = BTC, '101' = SOL), which is NOT the EVM chain-id
 * namespace used by lib/tokens.ts. These tests guard against:
 *  - a catalog entry with a chainName outside the 4 chains Dynamic
 *    supports for deposit addresses (BTC, SOL, EVM, TRON)
 *  - poll classification drift (source_confirmed -> confirmed; the poll
 *    continues until settlement is terminal)
 */

import { describe, expect, it } from "vitest";

import {
  DEPOSIT_ADDRESS_SOURCE_OPTIONS,
  classifyDepositAddressFlow,
  depositAddressSendTitle,
  isValidRefundAddress,
  rawAmountToDecimal,
  type DepositAddressSourceOption,
} from "@/lib/deposit-address";

describe("DEPOSIT_ADDRESS_SOURCE_OPTIONS catalog", () => {
  it("only contains chains Dynamic supports for deposit addresses", () => {
    const supported = new Set(["BTC", "SOL", "EVM", "TRON"]);
    for (const opt of DEPOSIT_ADDRESS_SOURCE_OPTIONS) {
      expect(supported.has(opt.chainName)).toBe(true);
    }
  });

  it("covers the chain families Dynamic can route to EVM settlement", () => {
    // TRON is deliberately absent: Relay rejects TRON -> EVM
    // deposit-address routes.
    const families = new Set(
      DEPOSIT_ADDRESS_SOURCE_OPTIONS.map((o) => o.chainName),
    );
    expect(families).toEqual(new Set(["BTC", "SOL", "EVM"]));
  });

  it("every entry has a fromChainId, decimals, symbol, and key", () => {
    for (const opt of DEPOSIT_ADDRESS_SOURCE_OPTIONS) {
      expect(opt.fromChainId.length).toBeGreaterThan(0);
      expect(opt.tokenDecimals).toBeGreaterThan(0);
      expect(opt.symbol.length).toBeGreaterThan(0);
      expect(opt.key.length).toBeGreaterThan(0);
    }
  });

  it("native entries omit the token address; token entries carry one", () => {
    for (const opt of DEPOSIT_ADDRESS_SOURCE_OPTIONS) {
      const isNative = opt.symbol === "BTC" || opt.symbol === "ETH";
      if (isNative) {
        expect(opt.tokenAddress).toBeUndefined();
      } else {
        expect(opt.tokenAddress && opt.tokenAddress.length).toBeGreaterThan(0);
      }
    }
  });

  it("phrases every sublabel as 'on <network>'", () => {
    for (const opt of DEPOSIT_ADDRESS_SOURCE_OPTIONS) {
      expect(opt.sublabel).toMatch(/^on \S/);
    }
  });

  it("uses documented Dynamic ids for BTC and SOL", () => {
    const btc = DEPOSIT_ADDRESS_SOURCE_OPTIONS.find(
      (o) => o.chainName === "BTC",
    );
    const sol = DEPOSIT_ADDRESS_SOURCE_OPTIONS.find(
      (o) => o.chainName === "SOL",
    );
    expect(btc?.fromChainId).toBe("1");
    expect(sol?.fromChainId).toBe("101");
  });
});

describe("rawAmountToDecimal", () => {
  it("keeps full precision beyond the 6-decimal display cap", () => {
    expect(rawAmountToDecimal("130123456789012", 18)).toBe(
      "0.000130123456789012",
    );
  });

  it("formats whole and fractional token amounts", () => {
    expect(rawAmountToDecimal("250000000", 6)).toBe("250");
    expect(rawAmountToDecimal("130000000000000", 18)).toBe("0.00013");
    expect(rawAmountToDecimal("100000000", 8)).toBe("1");
  });

  it("handles zero and rejects non-integer input", () => {
    expect(rawAmountToDecimal("0", 6)).toBe("0");
    expect(rawAmountToDecimal("1.5", 6)).toBeNull();
    expect(rawAmountToDecimal("abc", 6)).toBeNull();
    expect(rawAmountToDecimal("", 6)).toBeNull();
  });
});

describe("classifyDepositAddressFlow", () => {
  it("keeps waiting while quoted", () => {
    expect(
      classifyDepositAddressFlow({
        executionState: "quoted",
        settlementState: "none",
      }),
    ).toBe("waiting");
  });

  it("confirms on source_confirmed", () => {
    expect(
      classifyDepositAddressFlow({
        executionState: "source_confirmed",
        settlementState: "none",
      }),
    ).toBe("confirmed");
  });

  it("confirms on completed settlement", () => {
    expect(
      classifyDepositAddressFlow({
        executionState: "source_confirmed",
        settlementState: "completed",
      }),
    ).toBe("confirmed");
  });

  it("expires on expired execution state", () => {
    expect(classifyDepositAddressFlow({ executionState: "expired" })).toBe(
      "expired",
    );
  });

  it("fails on failed or cancelled execution, or failed settlement", () => {
    expect(classifyDepositAddressFlow({ executionState: "failed" })).toBe(
      "failed",
    );
    expect(classifyDepositAddressFlow({ executionState: "cancelled" })).toBe(
      "failed",
    );
    expect(
      classifyDepositAddressFlow({
        executionState: "source_confirmed",
        settlementState: "failed",
      }),
    ).toBe("failed");
  });

  it("waits on unknown/missing states", () => {
    expect(classifyDepositAddressFlow({})).toBe("waiting");
    expect(
      classifyDepositAddressFlow({ executionState: "source_attached" }),
    ).toBe("waiting");
  });
});

describe("depositAddressSendTitle", () => {
  const byKey = (key: string): DepositAddressSourceOption => {
    const opt = DEPOSIT_ADDRESS_SOURCE_OPTIONS.find((o) => o.key === key);
    if (!opt) throw new Error(`missing catalog entry: ${key}`);
    return opt;
  };

  it("drops the redundant network suffix for native assets", () => {
    expect(depositAddressSendTitle(byKey("btc"))).toBe("Send BTC");
    expect(depositAddressSendTitle(byKey("eth"))).toBe("Send ETH");
  });

  it("keeps the chain for token assets", () => {
    expect(depositAddressSendTitle(byKey("usdc-base"))).toBe(
      "Send USDC on Base",
    );
    expect(depositAddressSendTitle(byKey("usdc-solana"))).toBe(
      "Send USDC on Solana",
    );
  });
});

describe("isValidRefundAddress", () => {
  it("accepts an address on the source chain", () => {
    expect(
      isValidRefundAddress("BTC", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"),
    ).toBe(true);
    expect(
      isValidRefundAddress("BTC", "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"),
    ).toBe(true);
    expect(
      isValidRefundAddress("EVM", "0x1111111111111111111111111111111111111111"),
    ).toBe(true);
    expect(
      isValidRefundAddress(
        "SOL",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      ),
    ).toBe(true);
  });

  it("rejects an address from another chain family", () => {
    expect(
      isValidRefundAddress("BTC", "0x1111111111111111111111111111111111111111"),
    ).toBe(false);
    expect(
      isValidRefundAddress(
        "EVM",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      ),
    ).toBe(false);
    expect(
      isValidRefundAddress("SOL", "0x1111111111111111111111111111111111111111"),
    ).toBe(false);
  });

  it("rejects a legacy BTC address for SOL despite the shared base58 shape", () => {
    expect(
      isValidRefundAddress("SOL", "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"),
    ).toBe(false);
  });

  it("rejects malformed input and unsupported chains", () => {
    expect(isValidRefundAddress("EVM", "0xtooshort")).toBe(false);
    expect(isValidRefundAddress("BTC", "")).toBe(false);
    expect(
      isValidRefundAddress("TRON", "TQ2Xu8KcJ8yxL5cV1234567890abcdEFGh"),
    ).toBe(false);
  });
});
