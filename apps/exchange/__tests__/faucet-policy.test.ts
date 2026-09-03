import { describe, expect, it } from "vitest";
import { checkFaucetRequest, grantedToday, DEFAULT_FAUCET_AMOUNTS } from "../lib/faucet/policy";

const limits = { amounts: DEFAULT_FAUCET_AMOUNTS, maxPerRequest: 50, dailyPerAddress: 200 };
const now = 1_800_000_000_000;

describe("faucet policy", () => {
  it("accepts a listed amount when the treasury can cover it", () => {
    expect(checkFaucetRequest({ amount: 25, history: [], now, treasuryUsdc: 100 }, limits)).toEqual({ ok: true });
  });
  it("rejects amounts that are not on the list", () => {
    expect(checkFaucetRequest({ amount: 30, history: [], now, treasuryUsdc: 100 }, limits).ok).toBe(false);
    expect(checkFaucetRequest({ amount: -5, history: [], now, treasuryUsdc: 100 }, limits).ok).toBe(false);
  });
  it("enforces the per-address daily cap over a trailing 24 hours", () => {
    const history = [
      { at: now - 2 * 60 * 60 * 1000, amount: 50 },
      { at: now - 3 * 60 * 60 * 1000, amount: 50 },
      { at: now - 4 * 60 * 60 * 1000, amount: 50 },
      { at: now - 30 * 60 * 60 * 1000, amount: 50 }, // yesterday, ignored
    ];
    expect(grantedToday(history, now)).toBe(150);
    expect(checkFaucetRequest({ amount: 50, history, now, treasuryUsdc: 1000 }, limits)).toEqual({ ok: true });
    expect(checkFaucetRequest({ amount: 50, history: [...history, { at: now - 60_000, amount: 50 }], now, treasuryUsdc: 1000 }, limits).ok).toBe(false);
  });
  it("refuses when the treasury is short", () => {
    const v = checkFaucetRequest({ amount: 50, history: [], now, treasuryUsdc: 12 }, limits);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/treasury/);
  });
});
