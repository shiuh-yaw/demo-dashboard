/**
 * ProspectTheme dual-write + read-join tests (GTM-03.5B).
 *
 * Every write through PostgresProspectService must land on both the flat
 * `Prospect` columns (rollback safety until the contract phase) and the
 * 1:1 `ProspectTheme` row. Every read must join `ProspectTheme` and fall
 * back to the flat columns untouched when no theme row exists (rows
 * written before this deploy, or by a path that bypasses this service).
 */

import { describe, expect, it, vi } from "vitest";

import { PostgresProspectService } from "../prospects";
import { createFakePrisma } from "../../__tests__/fake-prisma";
import type { ProspectPrismaClient } from "../prospects";
import type { Prospect } from "../../types";

describe("PostgresProspectService + ProspectTheme dual-write", () => {
  it("create() writes matching Prospect flat columns and a ProspectTheme row", async () => {
    const client = createFakePrisma() as unknown as ProspectPrismaClient;
    const svc = new PostgresProspectService(client);
    const created = await svc.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#FF0000",
      accentColor: "#00FF00",
      gradientFrom: "#111111",
    });

    const theme = await client.prospectTheme.findUnique({
      where: { prospectId: created.id },
    });
    expect(theme).not.toBeNull();
    expect(theme!.primaryColor).toBe("#FF0000");
    expect(theme!.accentColor).toBe("#00FF00");
    expect(theme!.gradientFrom).toBe("#111111");
  });

  it("update() re-syncs the full ProspectTheme row, not just the changed field", async () => {
    const client = createFakePrisma() as unknown as ProspectPrismaClient;
    const svc = new PostgresProspectService(client);
    const created = await svc.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#FF0000",
      accentColor: "#00FF00",
    });
    await svc.update(created.id, { primaryColor: "#0000FF" });

    const theme = await client.prospectTheme.findUnique({
      where: { prospectId: created.id },
    });
    expect(theme!.primaryColor).toBe("#0000FF");
    // Untouched-by-this-update field stays in sync too.
    expect(theme!.accentColor).toBe("#00FF00");

    const row = await svc.get(created.id);
    expect(row!.primaryColor).toBe("#0000FF");
    expect(row!.accentColor).toBe("#00FF00");
  });

  it("update() writes ProspectTheme before the flat Prospect columns", async () => {
    const client = createFakePrisma() as unknown as ProspectPrismaClient;
    const svc = new PostgresProspectService(client);
    const created = await svc.create({
      ownerId: "owner-1",
      name: "Acme",
      primaryColor: "#FF0000",
    });

    const themeUpsert = vi.spyOn(client.prospectTheme, "upsert");
    const prospectUpdate = vi.spyOn(client.prospect, "update");

    await svc.update(created.id, { primaryColor: "#0000FF" });

    expect(themeUpsert).toHaveBeenCalledTimes(1);
    expect(prospectUpdate).toHaveBeenCalledTimes(1);
    // Theme lands before the flat columns - reads let ProspectTheme win
    // wholesale, so a crash between writes must never serve a stale theme.
    expect(themeUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      prospectUpdate.mock.invocationCallOrder[0],
    );
  });

  it("get()/list() fall back to the flat Prospect columns when no ProspectTheme row exists", async () => {
    // Hand-rolled client: prospect.findUnique/findMany return a fully
    // themed row, but prospectTheme always misses - simulating a row
    // written before this deploy (pre-dual-write) or by a path that
    // bypassed the service.
    const row: Prospect = {
      id: "p1",
      ownerId: "owner-1",
      teamId: null,
      createdById: null,
      status: "ACTIVE",
      name: "Legacy Co",
      description: null,
      companyUrl: null,
      logo: "dynamic",
      logoUrl: null,
      borderRadius: null,
      primaryColor: "#ABCDEF",
      primaryHoverColor: null,
      secondaryColor: null,
      accentColor: "#123456",
      pageBackground: null,
      background: null,
      foreground: null,
      mutedTextColor: null,
      borderColor: null,
      rowBackground: null,
      rowHoverBackground: null,
      gradientFrom: null,
      gradientTo: null,
      demoEarnId: null,
      demoCheckoutsId: null,
      demoWalletId: null,
      demoRemittanceId: null,
      domain: null,
      notes: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };
    const client: ProspectPrismaClient = {
      prospect: {
        create: async () => row,
        findUnique: async () => row,
        findMany: async () => [row],
        update: async () => row,
        delete: async () => row,
        upsert: async () => row,
      },
      prospectTheme: {
        findUnique: async () => null,
        findMany: async () => [],
        upsert: async ({ create }) => ({ ...create }),
      },
    };
    const svc = new PostgresProspectService(client);

    const fetched = await svc.get("p1");
    expect(fetched!.primaryColor).toBe("#ABCDEF");
    expect(fetched!.accentColor).toBe("#123456");

    const [listed] = await svc.list();
    expect(listed!.primaryColor).toBe("#ABCDEF");
  });
});
