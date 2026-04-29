import { describe, expect, it } from "vitest";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { findExistingAccount } from "./useWalletProviderSync.js";

function makeAccount(args: {
  id: string;
  address: string;
  walletProviderKey: string;
}): WalletAccount {
  return {
    address: args.address,
    chain: "EVM" as WalletAccount["chain"],
    id: args.id,
    lastSelectedAt: null,
    verifiedCredentialId: null,
    walletProviderKey: args.walletProviderKey,
  } as WalletAccount;
}

describe("findExistingAccount", () => {
  const mmA = makeAccount({
    id: "metamaskevm:0xaaa",
    address: "0xAAA",
    walletProviderKey: "metamaskevm",
  });
  const mmB = makeAccount({
    id: "metamaskevm:0xbbb",
    address: "0xBBB",
    walletProviderKey: "metamaskevm",
  });
  const wcA = makeAccount({
    id: "walletconnect:0xaaa",
    address: "0xAAA",
    walletProviderKey: "walletconnect",
  });

  it("matches by address case-insensitively within the same provider", () => {
    expect(findExistingAccount([mmA, mmB], "metamaskevm", "0xaaa")).toBe(mmA);
    expect(findExistingAccount([mmA, mmB], "metamaskevm", "0xBBB")).toBe(mmB);
  });

  it("does not match across different providers", () => {
    expect(findExistingAccount([wcA], "metamaskevm", "0xAAA")).toBe(null);
  });

  it("returns null when address is not in the list", () => {
    expect(findExistingAccount([mmA, mmB], "metamaskevm", "0xCCC")).toBe(null);
  });

  it("returns null on empty accounts", () => {
    expect(findExistingAccount([], "metamaskevm", "0xAAA")).toBe(null);
  });
});
