/**
 * Profile action wiring (Phase GTM-07): requires a session, updates only the
 * caller's own row, trims blanks to null, and surfaces the service-layer
 * https-only validation as a friendly error.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: {
    users: { update: vi.fn() },
  },
  gtm: { getSessionUser: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/services", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services")>(
    "@/lib/services",
  );
  return { ...actual, services };
});
vi.mock("@/lib/auth/gtm", () => gtm);

import { updateProfile } from "@/lib/actions/profile";
import { InvalidSchedulingUrlError } from "@/lib/services";

const USER = { id: "u1", dynamicUserId: "sub-1", email: "se@x.com", role: "MEMBER" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateProfile", () => {
  it("rejects an unauthenticated caller", async () => {
    gtm.getSessionUser.mockResolvedValue(null);
    const result = await updateProfile({ displayName: "X" });
    expect(result).toEqual({ success: false, error: "Authentication required" });
    expect(services.users.update).not.toHaveBeenCalled();
  });

  it("updates the caller's own row and trims blanks to null", async () => {
    gtm.getSessionUser.mockResolvedValue(USER);
    services.users.update.mockResolvedValue({ ...USER, displayName: "Ada" });
    const result = await updateProfile({
      displayName: "Ada",
      avatarUrl: "   ",
      schedulingUrl: "https://cal.com/ada",
    });
    expect(result.success).toBe(true);
    expect(services.users.update).toHaveBeenCalledWith("u1", {
      displayName: "Ada",
      avatarUrl: null,
      schedulingUrl: "https://cal.com/ada",
    });
  });

  it("maps InvalidSchedulingUrlError to a friendly message", async () => {
    gtm.getSessionUser.mockResolvedValue(USER);
    services.users.update.mockRejectedValue(
      new InvalidSchedulingUrlError("must be https"),
    );
    const result = await updateProfile({ schedulingUrl: "http://insecure" });
    expect(result).toEqual({
      success: false,
      error: "Scheduling URL must be a valid https link",
    });
  });
});
