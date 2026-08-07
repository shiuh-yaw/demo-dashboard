import { describe, expect, it } from "vitest";
import type { BusinessAccountDetail } from "../lib/dynamic";
import {
  accountName,
  assignableRole,
  canAddSigner,
  canManageMembers,
  canRemoveSigner,
  canRemoveWallet,
  initials,
  isOwner,
  shorten,
  signersOf,
  walletsOf,
} from "../lib/business-accounts/view";

const OWNER = "user-owner";
const ADMIN = "user-admin";
const VIEWER = "user-viewer";

const WALLET_A = {
  id: "wallet-a",
  publicKey: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  chain: "EVM",
};
const WALLET_B = {
  id: "wallet-b",
  publicKey: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  chain: "SOL",
};

function detail(
  overrides: Partial<BusinessAccountDetail> = {},
): BusinessAccountDetail {
  return {
    id: "ba-1",
    projectEnvironmentId: "env-1",
    name: "Acme Treasury",
    members: [
      { id: "m1", businessAccountId: "ba-1", userId: OWNER, role: "owner" },
      { id: "m2", businessAccountId: "ba-1", userId: ADMIN, role: "admin" },
      { id: "m3", businessAccountId: "ba-1", userId: VIEWER, role: "viewer" },
    ],
    signers: [
      {
        id: "s1",
        businessAccountId: "ba-1",
        walletId: "wallet-a",
        userId: OWNER,
        type: "endUser",
        shareSetId: "share-1",
      },
    ],
    wallets: [WALLET_A, WALLET_B],
    ...overrides,
  };
}

describe("walletsOf", () => {
  it("prefers detail.wallets, which is a superset of signers' wallets", () => {
    expect(walletsOf(detail()).map((w) => w.id)).toEqual([
      "wallet-a",
      "wallet-b",
    ]);
  });

  it("falls back to the ids signers reference when wallets is absent", () => {
    const fallback = walletsOf(detail({ wallets: undefined }));
    expect(fallback.map((w) => w.id)).toEqual(["wallet-a"]);
    // Fallback entries carry no address, so nothing can be reshared from them.
    expect(fallback[0]!.publicKey).toBeUndefined();
  });

  it("is empty for no detail", () => {
    expect(walletsOf(undefined)).toEqual([]);
  });
});

describe("roles", () => {
  it("isOwner is true only for the owner", () => {
    expect(isOwner(detail(), OWNER)).toBe(true);
    expect(isOwner(detail(), ADMIN)).toBe(false);
    expect(isOwner(detail(), null)).toBe(false);
    expect(isOwner(detail(), "stranger")).toBe(false);
  });

  it("canManageMembers covers owner and admin, not viewer", () => {
    expect(canManageMembers(detail(), OWNER)).toBe(true);
    expect(canManageMembers(detail(), ADMIN)).toBe(true);
    expect(canManageMembers(detail(), VIEWER)).toBe(false);
  });
});

describe("canAddSigner", () => {
  it("requires an active share on that wallet", () => {
    expect(canAddSigner(detail(), OWNER, WALLET_A)).toBe(true);
    // Owner administers wallet-b but holds no share on it.
    expect(canAddSigner(detail(), OWNER, WALLET_B)).toBe(false);
    // Admin reach is not signing reach.
    expect(canAddSigner(detail(), ADMIN, WALLET_A)).toBe(false);
  });

  it("rejects a pending signer row (no share set minted yet)", () => {
    const pending = detail({
      signers: [
        {
          id: "s1",
          businessAccountId: "ba-1",
          walletId: "wallet-a",
          userId: OWNER,
          type: "endUser",
          shareSetId: null,
        },
      ],
    });
    expect(canAddSigner(pending, OWNER, WALLET_A)).toBe(false);
  });

  it("rejects a wallet with no address or chain to reshare by", () => {
    const bare = { id: "wallet-a" } as (typeof WALLET_A);
    expect(canAddSigner(detail(), OWNER, bare)).toBe(false);
  });
});

describe("backend guards mirrored in the UI", () => {
  it("canRemoveSigner is false for a wallet's last signer", () => {
    expect(canRemoveSigner(detail(), WALLET_A)).toBe(false);
    const two = detail({
      signers: [
        ...detail().signers,
        {
          id: "s2",
          businessAccountId: "ba-1",
          walletId: "wallet-a",
          userId: ADMIN,
          type: "endUser",
          shareSetId: "share-2",
        },
      ],
    });
    expect(canRemoveSigner(two, WALLET_A)).toBe(true);
  });

  it("canRemoveWallet is false for an account's last wallet", () => {
    expect(canRemoveWallet(detail())).toBe(true);
    expect(canRemoveWallet(detail({ wallets: [WALLET_A] }))).toBe(false);
  });
});

describe("signersOf", () => {
  it("returns only that wallet's signers", () => {
    expect(signersOf(detail(), "wallet-a").map((s) => s.id)).toEqual(["s1"]);
    expect(signersOf(detail(), "wallet-b")).toEqual([]);
  });
});

describe("formatting", () => {
  it("shortens long ids and passes short ones through", () => {
    expect(shorten(WALLET_A.publicKey)).toBe("0xAAAA…AAAA");
    expect(shorten("short")).toBe("short");
    expect(shorten(undefined)).toBe("-");
    // Custom lengths, and a value too short to be worth truncating.
    expect(shorten("0x1234567890abcdefgh", 10, 6)).toBe("0x12345678…cdefgh");
    expect(shorten("0x1234567890", 10, 6)).toBe("0x1234567890");
  });

  it("derives initials, falling back for an unnamed account", () => {
    expect(initials("Acme Treasury")).toBe("AC");
    expect(initials(null)).toBe("??");
  });

  it("names an unnamed account", () => {
    expect(accountName({ name: "  " })).toBe("Untitled account");
    expect(accountName({ name: "Acme" })).toBe("Acme");
  });

  it("admits only the two roles a picker may assign", () => {
    expect(assignableRole("admin")).toBe("admin");
    expect(assignableRole("viewer")).toBe("viewer");
    // Ownership moves by transfer, so it is never an assignable option.
    expect(assignableRole("owner")).toBeNull();
    expect(assignableRole(undefined)).toBeNull();
  });
});
