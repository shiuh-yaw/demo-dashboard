/**
 * Wallet action wiring: proves each mutating action routes through the shared
 * policy/session helpers (VIEWER rejected, MEMBER own-only, ADMIN anything)
 * and that lists are visibility-scoped through isDemoConfigVisible. The
 * decision logic itself is covered by policy.test.ts / gtm.test.ts; this test
 * guards the wiring so a dropped guard is caught.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm, policy } = vi.hoisted(() => ({
  services: {
    demoConfigs: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    },
    prospects: { get: vi.fn() },
  },
  gtm: {
    getSessionUser: vi.fn(),
    canMutateDemoConfig: vi.fn(),
    visibleProspectIds: vi.fn(),
    isDemoConfigVisible: vi.fn(),
  },
  policy: { canCreateRecord: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/normalize-logo", () => ({
  normalizeBrandingLogos: (c: unknown) => c,
}));
vi.mock("@/lib/services/demo-config-mappers/wallet", () => ({
  walletMapper: {
    toCreateInput: vi.fn(async (_p: unknown, input: Record<string, unknown>) => input),
    toUpdateInput: vi.fn(async (_p: unknown, _e: unknown, input: Record<string, unknown>) => input),
    toStored: vi.fn((record: Record<string, unknown>) => record),
  },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => policy);

import {
  createWalletConfig,
  updateWalletConfig,
  getAllWalletConfigs,
  getWalletConfig,
} from "@/lib/actions/wallets";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };
const ADMIN = { id: "u9", dynamicUserId: "sub-9", role: "ADMIN" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getWalletConfig (detail-read visibility, I-1 fix)", () => {
  const record = {
    id: "d1",
    kind: "wallet",
    ownerId: "sub-2",
    createdById: "u2",
    prospectId: null,
  };

  it("MEMBER reading another member's record gets the same not-found as a missing id", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.demoConfigs.get.mockResolvedValue(record);
    gtm.visibleProspectIds.mockResolvedValue(new Set());
    gtm.isDemoConfigVisible.mockReturnValue(false);
    const res = await getWalletConfig("d1");
    expect(res).toEqual({ success: false, error: "Wallet config not found" });
    const missing = await (async () => {
      services.demoConfigs.get.mockResolvedValue(null);
      return getWalletConfig("nonexistent");
    })();
    expect(missing).toEqual(res);
  });

  it("MEMBER reads their own record fine", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.demoConfigs.get.mockResolvedValue({
      ...record,
      ownerId: "sub-1",
      createdById: "u1",
    });
    gtm.visibleProspectIds.mockResolvedValue(new Set());
    gtm.isDemoConfigVisible.mockReturnValue(true);
    const res = await getWalletConfig("d1");
    expect(res.success).toBe(true);
  });

  it("ADMIN reads anything ('all' visibility)", async () => {
    gtm.getSessionUser.mockResolvedValue(ADMIN);
    services.demoConfigs.get.mockResolvedValue(record);
    gtm.visibleProspectIds.mockResolvedValue("all");
    gtm.isDemoConfigVisible.mockReturnValue(true);
    const res = await getWalletConfig("d1");
    expect(res.success).toBe(true);
  });
});

describe("createWalletConfig", () => {
  it("rejects a VIEWER before any write", async () => {
    gtm.getSessionUser.mockResolvedValue({ ...MEMBER, role: "VIEWER" });
    policy.canCreateRecord.mockReturnValue(false);
    const res = await createWalletConfig("demo");
    expect(res).toEqual({ success: false, error: "Access denied" });
    expect(services.demoConfigs.create).not.toHaveBeenCalled();
  });

  it("stamps createdById=user.id and ownerId=user.dynamicUserId", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    policy.canCreateRecord.mockReturnValue(true);
    services.demoConfigs.create.mockResolvedValue({ id: "d1", prospectId: null });
    await createWalletConfig("demo");
    const created = services.demoConfigs.create.mock.calls[0]![0];
    expect(created).toMatchObject({ ownerId: "sub-1", createdById: "u1" });
  });
});

describe("updateWalletConfig", () => {
  it("denies when canMutateDemoConfig returns false (another user's record)", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.demoConfigs.get.mockResolvedValue({
      id: "d1",
      kind: "wallet",
      ownerId: "sub-2",
      createdById: "u2",
      prospectId: null,
    });
    gtm.canMutateDemoConfig.mockResolvedValue(false);
    const res = await updateWalletConfig("d1", { name: "x" });
    expect(res).toEqual({ success: false, error: "Access denied" });
    expect(services.demoConfigs.update).not.toHaveBeenCalled();
  });

  it("allows the update when canMutateDemoConfig returns true", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    services.demoConfigs.get.mockResolvedValue({
      id: "d1",
      kind: "wallet",
      ownerId: "sub-1",
      createdById: "u1",
      prospectId: null,
    });
    gtm.canMutateDemoConfig.mockResolvedValue(true);
    services.demoConfigs.update.mockResolvedValue({ id: "d1", prospectId: null });
    const res = await updateWalletConfig("d1", { name: "x" });
    expect(res.success).toBe(true);
    expect(services.demoConfigs.update).toHaveBeenCalledOnce();
  });
});

describe("getAllWalletConfigs (list wiring, ADMIN 'all' visibility)", () => {
  it("returns other owners' visible rows in configs and null-owner rows in orphaned", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.visibleProspectIds.mockResolvedValue("all");
    gtm.isDemoConfigVisible.mockReturnValue(true);
    services.demoConfigs.list.mockResolvedValue([
      { id: "mine", ownerId: "sub-1", prospectId: null, updatedAt: new Date() },
      { id: "theirs", ownerId: "sub-2", prospectId: null, updatedAt: new Date() },
      { id: "orphan", ownerId: "", prospectId: null, updatedAt: new Date() },
    ]);
    services.prospects.get.mockResolvedValue(null);
    const { configs, orphaned } = await getAllWalletConfigs();
    const configIds = configs.map((c) => (c as { id: string }).id).sort();
    expect(configIds).toEqual(["mine", "theirs"]);
    expect(orphaned.map((c) => (c as { id: string }).id)).toEqual(["orphan"]);
  });
});
