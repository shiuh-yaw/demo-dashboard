import { describe, expect, it } from "vitest";
import {
  findSignableWallet,
  signableWalletsFor,
} from "../lib/dynamic/wallet-accounts";
import type { WalletAccount } from "../lib/dynamic/wallet-accounts";

function account(
  overrides: Partial<WalletAccount> & { businessAccountId?: string } = {},
): WalletAccount {
  return {
    address: "0xAbC0000000000000000000000000000000000001",
    chain: "EVM",
    id: "wa-1",
    lastSelectedAt: null,
    verifiedCredentialId: null,
    walletProviderKey: "dynamicwaas",
    ...overrides,
  } as WalletAccount;
}

describe("signableWalletsFor", () => {
  const accounts = [
    account({ id: "personal", businessAccountId: undefined }),
    account({ id: "biz-a", businessAccountId: "acct-1" }),
    account({ id: "biz-b", businessAccountId: "acct-2" }),
    account({ id: "biz-c", businessAccountId: "acct-1" }),
  ];

  it("keeps only the wallets owned by that account", () => {
    expect(signableWalletsFor(accounts, "acct-1").map((a) => a.id)).toEqual([
      "biz-a",
      "biz-c",
    ]);
  });

  it("never returns a personal wallet, which carries no businessAccountId", () => {
    expect(signableWalletsFor(accounts, "acct-2").map((a) => a.id)).toEqual([
      "biz-b",
    ]);
  });

  it("is empty for an account this session holds no share for", () => {
    expect(signableWalletsFor(accounts, "acct-9")).toEqual([]);
  });
});

describe("findSignableWallet", () => {
  const accounts = [
    account({ id: "wa-1", address: "0xAAA" }),
    account({ id: "wa-2", address: "0xBBB" }),
  ];

  it("matches on id first", () => {
    expect(findSignableWallet(accounts, { id: "wa-2" })?.address).toBe("0xBBB");
  });

  it("falls back to the address when the ids differ", () => {
    // The roster and the session can record the same key material under
    // different ids, so a miss on id is not a miss on the wallet.
    const found = findSignableWallet(accounts, {
      id: "roster-id",
      publicKey: "0xbbb",
    });
    expect(found?.id).toBe("wa-2");
  });

  it("is case-insensitive on the address", () => {
    expect(
      findSignableWallet(accounts, { id: "x", publicKey: "0xAaA" })?.id,
    ).toBe("wa-1");
  });

  it("returns null when nothing matches, which is how an admin who cannot sign is detected", () => {
    expect(findSignableWallet(accounts, { id: "x", publicKey: "0xCCC" })).toBe(
      null,
    );
    expect(findSignableWallet(accounts, { id: "x" })).toBe(null);
    expect(findSignableWallet([], { id: "wa-1" })).toBe(null);
  });
});
