/**
 * backfill-users orchestrator - driven with a mocked Dynamic directory
 * client and in-memory user/team Prisma fakes. Covers allowlist filtering,
 * upsert idempotency, dry-run (no writes), and legacy createdById claiming.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresGtmUserService } from "@/lib/services/postgres/users";
import { PostgresTeamService } from "@/lib/services/postgres/teams";
import { createFakeUserPrisma } from "@/lib/services/__tests__/fake-prisma-users";
import { createFakeTeamPrisma } from "@/lib/services/__tests__/fake-prisma-teams";

import { runBackfillUsers } from "../run";
import type { DynamicDirectoryClient, DynamicDirectoryUser } from "../types";

function fakeClient(users: DynamicDirectoryUser[]): DynamicDirectoryClient {
  return { listEnvironmentUsers: async () => users };
}

async function setup(directory: DynamicDirectoryUser[]) {
  const userPrisma = createFakeUserPrisma();
  const teamPrisma = createFakeTeamPrisma();
  const users = new PostgresGtmUserService(userPrisma);
  const teams = new PostgresTeamService(teamPrisma);
  // Seed the default team the migration would have created.
  await teams.create({ name: "GTM", slug: "gtm" });
  return {
    userPrisma,
    teamPrisma,
    deps: {
      client: fakeClient(directory),
      users,
      teams,
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

  it("throws when the default team is missing", async () => {
    const teamPrisma = createFakeTeamPrisma();
    await expect(
      runBackfillUsers({
        client: fakeClient(dir),
        users: new PostgresGtmUserService(createFakeUserPrisma()),
        teams: new PostgresTeamService(teamPrisma),
        allowedDomains: ["fireblocks.com"],
      }),
    ).rejects.toThrow(/default team/);
  });

  it("upserts allowlisted users, links dynamicUserId, and skips off-domain", async () => {
    const { userPrisma, deps } = await setup(dir);
    const report = await runBackfillUsers(deps);

    expect(report.totals.usersUpserted).toBe(2);
    expect(report.totals.membershipsEnsured).toBe(2);
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

  it("is idempotent - a second run links nothing new and does not duplicate members", async () => {
    const { userPrisma, teamPrisma, deps } = await setup(dir);
    await runBackfillUsers(deps);
    const usersAfterFirst = userPrisma.__users.size;
    const membersAfterFirst = teamPrisma.__memberships.size;

    const second = await runBackfillUsers(deps);
    expect(userPrisma.__users.size).toBe(usersAfterFirst);
    expect(teamPrisma.__memberships.size).toBe(membersAfterFirst);
    expect(second.results.filter((r) => r.outcome === "already-linked")).toHaveLength(2);
  });

  it("dry-run writes nothing", async () => {
    const { userPrisma, teamPrisma, deps } = await setup(dir);
    const report = await runBackfillUsers({ ...deps, dryRun: true });
    expect(userPrisma.__users.size).toBe(0);
    expect(teamPrisma.__memberships.size).toBe(0);
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
