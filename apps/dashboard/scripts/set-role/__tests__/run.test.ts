/**
 * set-role core logic - real PostgresGtmUserService over an in-memory fake.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PostgresGtmUserService } from "@/lib/services/postgres/users";
import { createFakeUserPrisma } from "@/lib/services/__tests__/fake-prisma-users";
import {
  InvalidRoleError,
  UnknownUserError,
  runSetRole,
} from "../run";

describe("runSetRole", () => {
  let users: PostgresGtmUserService;

  beforeEach(() => {
    users = new PostgresGtmUserService(createFakeUserPrisma());
  });

  it("promotes an existing user and reports before/after", async () => {
    const created = await users.getOrCreateByEmail("boss@fireblocks.com");
    expect(created.role).toBe("MEMBER");
    const log = vi.fn();
    const result = await runSetRole({
      users,
      email: "boss@fireblocks.com",
      role: "owner",
      log,
    });
    expect(result).toEqual({ before: "MEMBER", after: "OWNER" });
    expect(log).toHaveBeenCalledWith("boss@fireblocks.com: MEMBER -> OWNER");
    expect((await users.findByEmail("boss@fireblocks.com"))!.role).toBe("OWNER");
  });

  it("refuses an unknown email (never creates)", async () => {
    await expect(
      runSetRole({ users, email: "ghost@fireblocks.com", role: "ADMIN" }),
    ).rejects.toBeInstanceOf(UnknownUserError);
    expect(await users.findByEmail("ghost@fireblocks.com")).toBeNull();
  });

  it("refuses an invalid role before any lookup", async () => {
    await users.getOrCreateByEmail("x@fireblocks.com");
    await expect(
      runSetRole({ users, email: "x@fireblocks.com", role: "SUPERUSER" }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
  });
});
