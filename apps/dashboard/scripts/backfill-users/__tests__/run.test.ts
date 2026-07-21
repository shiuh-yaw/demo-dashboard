/**
 * backfill-users orchestrator - driven with a mocked Dynamic directory
 * client and an in-memory user Prisma fake. Covers allowlist filtering,
 * upsert idempotency, dry-run (no writes), and legacy createdById claiming.
 * Team membership is explicit-only; the backfill never joins a team.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresGtmUserService } from "@/lib/services/postgres/users";
import { createFakeUserPrisma } from "@/lib/services/__tests__/fake-prisma-users";

import { runBackfillUsers } from "../run";
import type { DynamicDirectoryClient, DynamicDirectoryUser } from "../types";

function fakeClient(users: DynamicDirectoryUser[]): DynamicDirectoryClient {
  return { listEnvironmentUsers: async () => users };
}

async function setup(directory: DynamicDirectoryUser[]) {
  const userPrisma = createFakeUserPrisma();
  const users = new PostgresGtmUserService(userPrisma);
  return {
    userPrisma,
    deps: {
      client: fakeClient(directory),
      users,
      allowedDomains: ["fireblocks.com", "dynamic.xyz"],
      log: () => {},
    },
  };
}

describe("runBackfillUsers", () => {
  let dir: DynamicDirectoryUser[];

  beforeEach(() => {
    dir = [
      { userId: "sub-a", email: "Sam@Fireblocks.com" },
      { userId: "sub-b", email: "dev@dynamic.xyz" },
      { userId: "sub-c", email: "outsider@gmail.com" },
    ];
  });

  it("upserts allowlisted users, links dynamicUserId, and skips off-domain", async () => {
    const { userPrisma, deps } = await setup(dir);
    const report = await runBackfillUsers(deps);

    expect(report.totals.usersUpserted).toBe(2);
    expect(report.totals.skipped).toBe(1);
    // Off-domain user never created.
    expect(userPrisma.__users.size).toBe(2);
    const emails = Array.from(userPrisma.__users.values()).map((u) => u.email);
    expect(emails.sort()).toEqual(["dev@dynamic.xyz", "sam@fireblocks.com"]);
    // dynamicUserId written.
    const sam = Array.from(userPrisma.__users.values()).find(
      (u) => u.email === "sam@fireblocks.com",
    );
    expect(sam!.dynamicUserId).toBe("sub-a");
  });

  it("is idempotent - a second run links nothing new", async () => {
    const { userPrisma, deps } = await setup(dir);
    await runBackfillUsers(deps);
    const usersAfterFirst = userPrisma.__users.size;

    const second = await runBackfillUsers(deps);
    expect(userPrisma.__users.size).toBe(usersAfterFirst);
    expect(second.results.filter((r) => r.outcome === "already-linked")).toHaveLength(2);
  });

  it("dry-run writes nothing", async () => {
    const { userPrisma, deps } = await setup(dir);
    const report = await runBackfillUsers({ ...deps, dryRun: true });
    expect(userPrisma.__users.size).toBe(0);
    expect(report.results.filter((r) => r.outcome === "would-link")).toHaveLength(2);
    expect(report.totals.skipped).toBe(1);
  });

  it("claims legacy prospect rows whose ownerId matches the Dynamic sub", async () => {
    const { userPrisma, deps } = await setup(dir);
    userPrisma.__prospects.set("p1", {
      id: "p1",
      ownerId: "sub-a",
      createdById: null,
    });
    userPrisma.__demoConfigs.set("d1", {
      id: "d1",
      ownerId: "sub-a",
      createdById: null,
    });
    const report = await runBackfillUsers(deps);
    expect(report.totals.prospectsClaimed).toBe(1);
    expect(report.totals.demoConfigsClaimed).toBe(1);
    expect(userPrisma.__prospects.get("p1")!.createdById).toEqual(
      expect.any(String),
    );
  });
});
