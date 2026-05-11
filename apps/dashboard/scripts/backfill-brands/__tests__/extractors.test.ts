import { describe, expect, it } from "vitest";
import type {
  BrandProfile,
  StoredCheckoutConfig,
  StoredEarnConfig,
  StoredRemittanceConfig,
  StoredWalletConfig,
} from "@/lib/types/dashboard";
import {
  extractFromBrandProfile,
  extractFromCheckout,
  extractFromEarn,
  extractFromRemittance,
  extractFromWallet,
} from "../extractors";

const baseProfile = (over: Partial<BrandProfile> = {}): BrandProfile => ({
  id: "bp_1",
  name: "Acme",
  brand: {
    logo: "custom",
    logoUrl: "https://example.com/logo.png",
    primaryColor: "#FF0000",
    accentColor: "#0000FF",
    theme: {
      primaryColor: "#FF0000",
      accentColor: "#0000FF",
      background: "#ffffff",
    },
  },
  demos: {},
  ownerId: "owner-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("extractFromBrandProfile", () => {
  it("emits a seed with normalised primary color and original logo", () => {
    const { seed, skipReason } = extractFromBrandProfile(baseProfile());
    expect(skipReason).toBeUndefined();
    expect(seed).not.toBeNull();
    expect(seed!.ownerId).toBe("owner-1");
    expect(seed!.name).toBe("Acme");
    expect(seed!.primaryColor).toBe("#ff0000");
    expect(seed!.accentColor).toBe("#0000ff");
    expect(seed!.logoUrl).toBe("https://example.com/logo.png");
    expect(seed!.source).toEqual({ kind: "brand-profile", id: "bp_1" });
  });

  it("falls back to BrandSettings.primaryColor when theme is absent", () => {
    const profile = baseProfile();
    profile.brand.theme = undefined;
    const { seed } = extractFromBrandProfile(profile);
    expect(seed!.primaryColor).toBe("#ff0000");
  });

  it("uses logoUrl only when logo === 'custom'", () => {
    const dynamicLogo = baseProfile({
      brand: {
        logo: "dynamic",
        logoUrl: "https://example.com/never-used.png",
        primaryColor: "#ff0000",
      },
    });
    const { seed } = extractFromBrandProfile(dynamicLogo);
    expect(seed!.logoUrl).toBeNull();
  });

  it("skips when ownerId is missing (orphan profile)", () => {
    const orphan = baseProfile({ ownerId: undefined });
    const { seed, skipReason } = extractFromBrandProfile(orphan);
    expect(seed).toBeNull();
    expect(skipReason).toMatch(/ownerId/);
  });

  it("skips when primaryColor is not a hex string", () => {
    const broken = baseProfile();
    broken.brand.primaryColor = "rgba(255,0,0,0.5)" as unknown as string;
    broken.brand.theme = undefined;
    const { seed, skipReason } = extractFromBrandProfile(broken);
    expect(seed).toBeNull();
    expect(skipReason).toMatch(/primaryColor/);
  });
});

describe("extractFromEarn", () => {
  const baseEarn = (over: Partial<StoredEarnConfig> = {}): StoredEarnConfig => ({
    id: "earn_1",
    name: "Earn 1",
    config: {
      theme: {
        primaryColor: "#abcdef",
        accentColor: "#123456",
      },
      branding: {
        logo: "custom",
        logoUrl: "https://x/earn.png",
      },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("emits a seed when theme + ownerId are present", () => {
    const { seed } = extractFromEarn(baseEarn());
    expect(seed!.primaryColor).toBe("#abcdef");
    expect(seed!.accentColor).toBe("#123456");
    expect(seed!.logoUrl).toBe("https://x/earn.png");
    expect(seed!.source).toEqual({ kind: "earn", id: "earn_1" });
  });

  it("skips when ownerId is missing", () => {
    const { seed, skipReason } = extractFromEarn(baseEarn({ ownerId: undefined }));
    expect(seed).toBeNull();
    expect(skipReason).toMatch(/ownerId/);
  });

  it("skips when theme.primaryColor is missing", () => {
    const broken = baseEarn();
    broken.config.theme = { accentColor: "#123456" };
    const { seed, skipReason } = extractFromEarn(broken);
    expect(seed).toBeNull();
    expect(skipReason).toMatch(/primaryColor/);
  });

  it("treats logo !== 'custom' as no logo", () => {
    const dyn = baseEarn();
    dyn.config.branding = { logo: "dynamic", logoUrl: "https://x/never.png" };
    const { seed } = extractFromEarn(dyn);
    expect(seed!.logoUrl).toBeNull();
  });
});

describe("extractFromWallet", () => {
  const baseWallet = (
    over: Partial<StoredWalletConfig> = {},
  ): StoredWalletConfig => ({
    id: "wallet_1",
    name: "Wallet 1",
    config: {
      theme: {
        primaryColor: "#aabbcc",
      },
      branding: {
        logo: "https://x/wallet.png",
      },
    },
    ownerId: "owner-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("emits a seed when theme + ownerId are present", () => {
    const { seed } = extractFromWallet(baseWallet());
    expect(seed!.primaryColor).toBe("#aabbcc");
    expect(seed!.logoUrl).toBe("https://x/wallet.png");
    expect(seed!.source).toEqual({ kind: "wallet", id: "wallet_1" });
  });

  it("skips when theme is absent entirely", () => {
    const empty = baseWallet();
    empty.config.theme = undefined;
    const { seed, skipReason } = extractFromWallet(empty);
    expect(seed).toBeNull();
    expect(skipReason).toMatch(/primaryColor/);
  });
});

describe("extractFromCheckout", () => {
  it("emits a seed using the widget config theme", () => {
    const ck: StoredCheckoutConfig = {
      id: "co_1",
      name: "CO 1",
      mode: "payment",
      config: {
        theme: {
          primaryColor: "#101010",
          accentColor: "#202020",
        },
        branding: { logo: "https://x/co.png" },
      } as unknown as StoredCheckoutConfig["config"],
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const { seed } = extractFromCheckout(ck);
    expect(seed!.primaryColor).toBe("#101010");
    expect(seed!.accentColor).toBe("#202020");
    expect(seed!.logoUrl).toBe("https://x/co.png");
    expect(seed!.source).toEqual({ kind: "checkout", id: "co_1" });
  });
});

describe("extractFromRemittance", () => {
  it("maps secondaryColor → accentColor", () => {
    const r: StoredRemittanceConfig = {
      id: "r_1",
      name: "R 1",
      config: {
        theme: { primaryColor: "#aaaaaa", secondaryColor: "#bbbbbb" },
        branding: { logoUrl: "https://x/r.png" },
      },
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const { seed } = extractFromRemittance(r);
    expect(seed!.primaryColor).toBe("#aaaaaa");
    expect(seed!.accentColor).toBe("#bbbbbb");
    expect(seed!.logoUrl).toBe("https://x/r.png");
    expect(seed!.source).toEqual({ kind: "remittance", id: "r_1" });
  });
});

// =============================================================================
// Phase 2-brand-cutover: extended coverage for the wider Brand row.
// =============================================================================

describe("Phase 2-brand-cutover extractor coverage", () => {
  function fullProfile(overrides: Partial<BrandProfile> = {}): BrandProfile {
    return {
      id: "bp_1",
      name: "Acme",
      companyUrl: "https://acme.example",
      ownerId: "owner-1",
      brand: {
        logo: "custom",
        logoUrl: "https://example.com/logo.png",
        primaryColor: "#FF0000",
        accentColor: "#0000FF",
        borderRadius: "md",
        theme: {
          primaryColor: "#FF0000",
          primaryHoverColor: "#cc0000",
          accentColor: "#0000FF",
          pageBackground: "#f6f8fa",
          background: "#ffffff",
          foreground: "#0e121b",
          mutedTextColor: "#99a0ae",
          borderColor: "#e1e4ea",
          rowBackground: "#f8f9fb",
          rowHoverBackground: "#eef1f1",
          gradientFrom: "#daffff",
          gradientTo: "rgba(218, 255, 255, 0.15)",
          borderRadius: "md",
        },
      },
      demos: {
        earn: "earn_1",
        checkouts: "ck_1",
        wallet: "w_1",
        remittance: "r_1",
      },
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
      ...overrides,
    };
  }

  it("extracts every visual theme field from a BrandProfile aggregate", () => {
    const { seed, skipReason } = extractFromBrandProfile(fullProfile());
    expect(skipReason).toBeUndefined();
    expect(seed).not.toBeNull();
    expect(seed!.companyUrl).toBe("https://acme.example");
    expect(seed!.logo).toBe("custom");
    expect(seed!.logoUrl).toBe("https://example.com/logo.png");
    expect(seed!.borderRadius).toBe("md");
    expect(seed!.primaryColor).toBe("#ff0000");
    expect(seed!.primaryHoverColor).toBe("#cc0000");
    expect(seed!.accentColor).toBe("#0000ff");
    expect(seed!.pageBackground).toBe("#f6f8fa");
    expect(seed!.background).toBe("#ffffff");
    expect(seed!.foreground).toBe("#0e121b");
    expect(seed!.mutedTextColor).toBe("#99a0ae");
    expect(seed!.borderColor).toBe("#e1e4ea");
    expect(seed!.rowBackground).toBe("#f8f9fb");
    expect(seed!.rowHoverBackground).toBe("#eef1f1");
    expect(seed!.gradientFrom).toBe("#daffff");
    expect(seed!.gradientTo).toBe("rgba(218, 255, 255, 0.15)");
    expect(seed!.demoEarnId).toBe("earn_1");
    expect(seed!.demoCheckoutsId).toBe("ck_1");
    expect(seed!.demoWalletId).toBe("w_1");
    expect(seed!.demoRemittanceId).toBe("r_1");
  });

  it("falls back to BrandSettings convenience accessors when theme is missing", () => {
    const profile = fullProfile({
      brand: {
        logo: "dynamic",
        primaryColor: "#FF0000",
        accentColor: "#0000FF",
        borderRadius: "lg",
      },
      demos: {},
    });
    const { seed } = extractFromBrandProfile(profile);
    expect(seed).not.toBeNull();
    expect(seed!.logo).toBe("dynamic");
    expect(seed!.logoUrl).toBeNull();
    expect(seed!.borderRadius).toBe("lg");
    expect(seed!.primaryColor).toBe("#ff0000");
    expect(seed!.accentColor).toBe("#0000ff");
    expect(seed!.pageBackground).toBeNull();
    expect(seed!.demoEarnId).toBeNull();
    expect(seed!.demoCheckoutsId).toBeNull();
    expect(seed!.demoWalletId).toBeNull();
    expect(seed!.demoRemittanceId).toBeNull();
  });

  it("idempotency invariant: hash unchanged when ownerId/primaryColor/logoUrl stay the same", async () => {
    const { hashBrandKey } = await import("../hash");
    const a = extractFromBrandProfile(fullProfile()).seed!;
    const b = extractFromBrandProfile(
      fullProfile({
        // Keep ownerId, primaryColor, logoUrl identical; mutate
        // everything else. Hash MUST match.
        demos: { earn: "different_earn" },
        brand: {
          ...fullProfile().brand,
          theme: {
            ...fullProfile().brand.theme!,
            pageBackground: "#000000",
          },
        },
      }),
    ).seed!;
    expect(hashBrandKey(a)).toBe(hashBrandKey(b));
  });

  it("orphan extractor: wallet config marks logo='custom' when branding.logo is a URL", () => {
    const wallet: StoredWalletConfig = {
      id: "w_1",
      ownerId: "owner-1",
      name: "Wallet",
      config: {
        theme: { primaryColor: "#112233" },
        branding: { logo: "https://example.com/w.png", showPoweredBy: true },
      } as StoredWalletConfig["config"],
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
    };
    const { seed } = extractFromWallet(wallet);
    expect(seed).not.toBeNull();
    expect(seed!.logo).toBe("custom");
    expect(seed!.logoUrl).toBe("https://example.com/w.png");
  });

  it("orphan extractor: checkout config sets logo='custom' when branding.logo is set", () => {
    const checkout: StoredCheckoutConfig = {
      id: "ck_1",
      ownerId: "owner-1",
      name: "Checkout",
      mode: "payment",
      config: {
        theme: { primaryColor: "#445566", accentColor: "#778899" },
        branding: { logo: "https://c/l.svg" },
      } as unknown as StoredCheckoutConfig["config"],
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
    };
    const { seed } = extractFromCheckout(checkout);
    expect(seed).not.toBeNull();
    expect(seed!.logo).toBe("custom");
    expect(seed!.logoUrl).toBe("https://c/l.svg");
    expect(seed!.primaryColor).toBe("#445566");
    expect(seed!.accentColor).toBe("#778899");
  });

  it("orphan extractor: remittance config sets logo='custom' when branding.logoUrl is set", () => {
    const remittance: StoredRemittanceConfig = {
      id: "r_1",
      ownerId: "owner-1",
      name: "Remittance",
      config: {
        theme: { primaryColor: "#aabbcc", secondaryColor: "#ddeeff" },
        branding: { logoUrl: "https://r/l.png" },
      },
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
    };
    const { seed } = extractFromRemittance(remittance);
    expect(seed).not.toBeNull();
    expect(seed!.logo).toBe("custom");
    expect(seed!.logoUrl).toBe("https://r/l.png");
    expect(seed!.primaryColor).toBe("#aabbcc");
    expect(seed!.accentColor).toBe("#ddeeff");
  });

  it("orphan extractor: earn config preserves the explicit logo discriminator", () => {
    const earn: StoredEarnConfig = {
      id: "earn_1",
      ownerId: "owner-1",
      name: "Earn",
      config: {
        theme: { primaryColor: "#FF0000", accentColor: "#0000FF" },
        branding: { logo: "custom", logoUrl: "https://e/l.png" },
      } as unknown as StoredEarnConfig["config"],
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
    };
    const { seed } = extractFromEarn(earn);
    expect(seed).not.toBeNull();
    expect(seed!.logo).toBe("custom");
    expect(seed!.logoUrl).toBe("https://e/l.png");
    expect(seed!.primaryColor).toBe("#ff0000");
    expect(seed!.accentColor).toBe("#0000ff");
    expect(seed!.pageBackground).toBeNull();
    expect(seed!.demoEarnId).toBeNull();
  });
});
