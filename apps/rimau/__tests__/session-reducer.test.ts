import { describe, expect, it } from "vitest";
import { beatOf, initialState, reducer } from "../lib/session/store";
import type { SessionWallet } from "../lib/session/types";

const wallet: SessionWallet = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: 11155111,
  chainName: "Ethereum Sepolia",
  scheme: "TWO_OF_TWO",
  curve: "ECDSA · DKLs23",
  shares: [
    { id: "d", location: "device", label: "device", encrypted: true, createdAt: 1 },
    { id: "e", location: "enclave", label: "enclave", encrypted: true, createdAt: 1 },
    { id: "b", location: "backup", label: "backup", encrypted: true, createdAt: 1 },
  ],
  backup: { location: "dynamic", status: "backed-up" },
  createdAt: 1,
  deviceId: "A",
};

const person = { userId: "u1", name: "Aisyah Rahman", email: "a@example.com", provider: "google" as const, initials: "AR" };

describe("session reducer", () => {
  it("device loss drops the client share and the session, never the balance or a position", () => {
    let s = initialState("staged");
    s = reducer(s, { type: "signed-in", person });
    s = reducer(s, { type: "wallet-ready", wallet });
    s = reducer(s, { type: "balances", balances: { usdc: 500 } });
    s = reducer(s, {
      type: "position-opened",
      position: { id: "p", protocol: "Aave", asset: "USDC", principal: 300, apy: 4.12, openedAt: 1, txHash: "0x" },
      debit: 300,
    });
    s = reducer(s, { type: "device-lost" });
    expect(s.person).toBeNull();
    expect(s.knownPerson?.name).toBe("Aisyah Rahman");
    expect(s.deviceLost).toBe(true);
    expect(s.device).toBe("B");
    expect(s.wallet?.shares.map((x) => x.location)).toEqual(["enclave", "backup"]);
    expect(s.balances.usdc).toBe(200);
    expect(s.positions).toHaveLength(1);
    expect(s.revealAddress).toBe(false);
  });

  it("recovery restores the same address on device B", () => {
    let s = reducer(reducer(initialState("staged"), { type: "wallet-ready", wallet }), { type: "device-lost" });
    s = reducer(s, { type: "recovered", wallet: { ...wallet, deviceId: "B", recoveredAt: 2 } });
    expect(s.deviceLost).toBe(false);
    expect(s.wallet?.address).toBe(wallet.address);
    expect(s.wallet?.deviceId).toBe("B");
  });

  it("the current beat is the first one not done", () => {
    let s = initialState("staged");
    expect(beatOf(s)).toBe(1);
    s = reducer(s, { type: "beat-done", beat: 1 });
    s = reducer(s, { type: "beat-done", beat: 2 });
    expect(beatOf(s)).toBe(3);
  });
});
