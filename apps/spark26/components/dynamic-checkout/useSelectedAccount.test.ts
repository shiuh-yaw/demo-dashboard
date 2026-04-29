import { describe, expect, it } from "vitest";
import type { WalletAccount } from "@dynamic-labs-sdk/client";
import { resolveSelectedAccount } from "./useSelectedAccount.js";

function makeAccount(id: string, address: string): WalletAccount {
  return {
    address,
    chain: "EVM" as WalletAccount["chain"],
    id,
    lastSelectedAt: null,
    verifiedCredentialId: null,
    walletProviderKey: "metamaskevm",
  } as WalletAccount;
}

describe("resolveSelectedAccount", () => {
  it("returns null account + null id when accounts is empty", () => {
    expect(resolveSelectedAccount([], null)).toEqual({
      selectedAccount: null,
      nextId: null,
    });
    // A previously-selected id is reset when accounts drain.
    expect(resolveSelectedAccount([], "stale")).toEqual({
      selectedAccount: null,
      nextId: null,
    });
  });

  it("auto-picks accounts[0] when nothing is selected yet", () => {
    const a = makeAccount("a", "0xAAA");
    const b = makeAccount("b", "0xBBB");
    const result = resolveSelectedAccount([a, b], null);
    expect(result.selectedAccount).toBe(a);
    expect(result.nextId).toBe("a");
  });

  it("returns the matching account when selectedId is present in the list", () => {
    const a = makeAccount("a", "0xAAA");
    const b = makeAccount("b", "0xBBB");
    const result = resolveSelectedAccount([a, b], "b");
    expect(result.selectedAccount).toBe(b);
    expect(result.nextId).toBe("b");
  });

  // THE BUG REPRO: MetaMask switches active account while keeping the same
  // provider-scoped WalletAccount.id. The accounts array carries an updated
  // object with the new address. The resolver MUST return the new object,
  // not a stale snapshot.
  it("reflects a live address update for the same id (MetaMask switch)", () => {
    const fresh = makeAccount("mm-evm", "0x5C26");
    // The caller's selectedId was 'mm-evm' when a stale 0x9C04 account was
    // picked; MetaMask's switch rewrites the entry with a new address but
    // the same id. The resolver must return the fresh object, not memoize
    // the old snapshot by id.
    const result = resolveSelectedAccount([fresh], "mm-evm");
    expect(result.selectedAccount).toBe(fresh);
    expect(result.selectedAccount?.address).toBe("0x5C26");
    expect(result.nextId).toBe("mm-evm");
  });

  it("falls back to accounts[0] when selectedId is no longer in the list", () => {
    const a = makeAccount("a", "0xAAA");
    const c = makeAccount("c", "0xCCC");
    // User had 'b' selected but 'b' got disconnected; only a and c remain.
    const result = resolveSelectedAccount([a, c], "b");
    expect(result.selectedAccount).toBe(a);
    expect(result.nextId).toBe("a");
  });
});
