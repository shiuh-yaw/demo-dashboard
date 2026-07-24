/**
 * setUserRole wiring - exercises the real canSetRole matrix through the action
 * with a mocked session + user service.
 */

import { beforeEach, expect, it, vi } from "vitest";

const { services, gtm } = vi.hoisted(() => ({
  services: { users: { get: vi.fn(), setRole: vi.fn() } },
  gtm: { getSessionUser: vi.fn() },
}));
vi.mock("@/lib/services", () => ({ services }));
vi.mock("@/lib/auth/gtm", () => gtm);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { setUserRole } from "@/lib/actions/users";

const actor = (role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") => ({
  id: "actor",
  dynamicUserId: "sub-actor",
  role,
});

beforeEach(() => vi.clearAllMocks());

it("rejects when unauthenticated", async () => {
  gtm.getSessionUser.mockResolvedValue(null);
  expect(await setUserRole("u2", "ADMIN")).toEqual({
    success: false,
    error: "Authentication required",
  });
});

it("returns not-found for an unknown target", async () => {
  gtm.getSessionUser.mockResolvedValue(actor("OWNER"));
  services.users.get.mockResolvedValue(null);
  expect(await setUserRole("ghost", "ADMIN")).toEqual({
    success: false,
    error: "User not found",
  });
});

it("OWNER may promote a MEMBER to ADMIN", async () => {
  gtm.getSessionUser.mockResolvedValue(actor("OWNER"));
  services.users.get.mockResolvedValue({ id: "u2", role: "MEMBER" });
  services.users.setRole.mockResolvedValue({ id: "u2", role: "ADMIN" });
  const res = await setUserRole("u2", "ADMIN");
  expect(res.success).toBe(true);
  expect(services.users.setRole).toHaveBeenCalledWith("u2", "ADMIN");
  // Persisted change is revalidated so the admin surface reflects it.
  expect(revalidatePath).toHaveBeenCalled();
});

it("ADMIN cannot touch an ADMIN target", async () => {
  gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
  services.users.get.mockResolvedValue({ id: "u2", role: "ADMIN" });
  const res = await setUserRole("u2", "MEMBER");
  expect(res).toEqual({ success: false, error: "Access denied" });
  expect(services.users.setRole).not.toHaveBeenCalled();
});

it("ADMIN cannot promote a MEMBER to OWNER", async () => {
  gtm.getSessionUser.mockResolvedValue(actor("ADMIN"));
  services.users.get.mockResolvedValue({ id: "u2", role: "MEMBER" });
  const res = await setUserRole("u2", "OWNER");
  expect(res).toEqual({ success: false, error: "Access denied" });
});

it("MEMBER can never set a role", async () => {
  gtm.getSessionUser.mockResolvedValue(actor("MEMBER"));
  services.users.get.mockResolvedValue({ id: "u2", role: "VIEWER" });
  const res = await setUserRole("u2", "MEMBER");
  expect(res).toEqual({ success: false, error: "Access denied" });
});
