/**
 * listProspectOptions: proves the picker's combobox fetch passes an explicit
 * `limit` to `prospectService.list` (MAX_PAGE_LIMIT) rather than relying on
 * the service's own default page size - the cap must be intentional, not an
 * accidental truncation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prospectService, gtm } = vi.hoisted(() => ({
  prospectService: { list: vi.fn() },
  gtm: {
    getSessionUser: vi.fn(),
    visibleProspectIds: vi.fn(),
    prospectVisibilityWhere: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/services", () => ({
  prospectService,
  services: { prospects: prospectService },
}));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("@/lib/auth/policy", () => ({ canCreateRecord: vi.fn() }));

import { MAX_PAGE_LIMIT } from "@/lib/services/postgres/pagination";
import { listProspectOptions } from "@/lib/actions/prospects";

const MEMBER = { id: "u1", dynamicUserId: "sub-1", role: "MEMBER" as const };

const row = (id: string) => ({
  id,
  name: `Prospect ${id}`,
  ownerId: "sub-1",
  createdById: "u1",
  companyUrl: null,
  logoUrl: null,
  primaryColor: "#000",
  primaryHoverColor: null,
  accentColor: null,
  pageBackground: null,
  background: null,
  foreground: null,
  mutedTextColor: null,
  borderColor: null,
  rowBackground: null,
  rowHoverBackground: null,
  gradientFrom: null,
  gradientTo: null,
  borderRadius: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listProspectOptions", () => {
  it("passes the explicit MAX_PAGE_LIMIT cap to prospectService.list", async () => {
    gtm.getSessionUser.mockResolvedValue(MEMBER);
    gtm.visibleProspectIds.mockResolvedValue(new Set(["p1"]));
    gtm.prospectVisibilityWhere.mockReturnValue({ id: { in: ["p1"] } });
    prospectService.list.mockResolvedValue({ items: [row("p1")], nextCursor: "next" });

    const res = await listProspectOptions();

    expect(prospectService.list).toHaveBeenCalledWith({
      where: { id: { in: ["p1"] } },
      limit: MAX_PAGE_LIMIT,
    });
    expect(res).toEqual({
      success: true,
      data: [expect.objectContaining({ id: "p1", isMine: true })],
    });
  });

  it("returns not-authenticated without querying the service", async () => {
    gtm.getSessionUser.mockResolvedValue(null);

    const res = await listProspectOptions();

    expect(res).toEqual({ success: false, error: "Authentication required" });
    expect(prospectService.list).not.toHaveBeenCalled();
  });
});
