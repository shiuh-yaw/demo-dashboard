/**
 * Share-link mint/revoke action wiring - MEMBER+ gate on mint, mint
 * coherence (bound config -> only its own prospect), owner-or-operator gate
 * on revoke. Session + services are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm, requestOrigin } = vi.hoisted(() => ({
  services: {
    demoConfigs: { get: vi.fn() },
    shareLinks: { mint: vi.fn(), get: vi.fn(), revoke: vi.fn() },
  },
  gtm: { getSessionUser: vi.fn() },
  requestOrigin: { getRequestOrigin: vi.fn() },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/request-origin", () => requestOrigin);

import { mintShareLink, revokeShareLink } from "@/lib/actions/share-links";

const actor = (role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER", id = "user_1") => ({
  id,
  dynamicUserId: `sub-${id}`,
  role,
});

const demoConfig = (prospectId: string | null) => ({
  id: "dc_1",
  kind: "wallet",
  prospectId,
});

beforeEach(() => {
  vi.clearAllMocks();
  requestOrigin.getRequestOrigin.mockResolvedValue("https://dashboard.dynamic.dev");
});

describe("mintShareLink", () => {
  it("requires a signed-in user", async () => {
    gtm.getSessionUser.mockResolvedValue(null);
    const result = await mintShareLink({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
    });
    expect(result).toEqual({
      success: false,
      error: "Authentication required",
    });
    expect(services.shareLinks.mint).not.toHaveBeenCalled();
  });

  it("rejects a VIEWER (MEMBER+ only)", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("VIEWER"));
    const result = await mintShareLink({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
    });
    expect(result.success).toBe(false);
    expect(services.shareLinks.mint).not.toHaveBeenCalled();
  });

  it("allows a MEMBER to mint for an unbound config", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    services.demoConfigs.get.mockResolvedValue(demoConfig(null));
    services.shareLinks.mint.mockResolvedValue({ token: "tok_123" });

    const result = await mintShareLink({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
    });
    expect(result).toEqual({
      success: true,
      data: { url: "https://dashboard.dynamic.dev/s/tok_123" },
    });
    expect(services.shareLinks.mint).toHaveBeenCalledWith({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
  });

  it("mint coherence: rejects a prospect that doesn't match a bound config", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    services.demoConfigs.get.mockResolvedValue(demoConfig("prospect_A"));

    const result = await mintShareLink({
      demoConfigId: "dc_1",
      prospectId: "prospect_B",
    });
    expect(result.success).toBe(false);
    expect(services.shareLinks.mint).not.toHaveBeenCalled();
  });

  it("mint coherence: allows minting a bound config for its own prospect", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    services.demoConfigs.get.mockResolvedValue(demoConfig("prospect_A"));
    services.shareLinks.mint.mockResolvedValue({ token: "tok_123" });

    const result = await mintShareLink({
      demoConfigId: "dc_1",
      prospectId: "prospect_A",
    });
    expect(result.success).toBe(true);
  });

  it("returns not-found when the demo config doesn't exist", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    services.demoConfigs.get.mockResolvedValue(null);

    const result = await mintShareLink({
      demoConfigId: "missing",
      prospectId: "prospect_1",
    });
    expect(result.success).toBe(false);
  });
});

describe("revokeShareLink", () => {
  it("requires a signed-in user", async () => {
    gtm.getSessionUser.mockResolvedValue(null);
    const result = await revokeShareLink("sl_1");
    expect(result).toEqual({ success: false, error: "Authentication required" });
    expect(services.shareLinks.revoke).not.toHaveBeenCalled();
  });

  it("returns not-found for an unknown link", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
    services.shareLinks.get.mockResolvedValue(null);
    const result = await revokeShareLink("sl_1");
    expect(result).toEqual({ success: false, error: "Share link not found" });
  });

  it("rejects a non-owner, non-operator MEMBER", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER", "user_2"));
    services.shareLinks.get.mockResolvedValue({ id: "sl_1", userId: "user_1" });
    const result = await revokeShareLink("sl_1");
    expect(result).toEqual({ success: false, error: "Access denied" });
    expect(services.shareLinks.revoke).not.toHaveBeenCalled();
  });

  it("allows the minting owner to revoke their own link", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("MEMBER", "user_1"));
    services.shareLinks.get.mockResolvedValue({ id: "sl_1", userId: "user_1" });
    services.shareLinks.revoke.mockResolvedValue({ id: "sl_1", status: "revoked" });
    const result = await revokeShareLink("sl_1");
    expect(result).toEqual({ success: true, data: { revoked: true } });
    expect(services.shareLinks.revoke).toHaveBeenCalledWith("sl_1");
  });

  it("allows an operator (ADMIN+) to revoke someone else's link", async () => {
    gtm.getSessionUser.mockResolvedValue(actor("ADMIN", "admin_1"));
    services.shareLinks.get.mockResolvedValue({ id: "sl_1", userId: "user_1" });
    services.shareLinks.revoke.mockResolvedValue({ id: "sl_1", status: "revoked" });
    const result = await revokeShareLink("sl_1");
    expect(result.success).toBe(true);
  });
});
