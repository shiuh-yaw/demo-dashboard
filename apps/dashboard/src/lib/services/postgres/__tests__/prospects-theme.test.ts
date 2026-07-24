/**
 * ProspectTheme dual-write + read-overlay tests (GTM-03.5B).
 *
 * Every write through PostgresProspectService lands on both the flat
 * `Prospect` columns (rollback safety) and the 1:1 `ProspectTheme` row, in a
 * single atomic nested write. Every read overlays `ProspectTheme` (canonical
 * when present) onto the flat columns, falling back to the flat columns when
 * no theme row exists (rows written before this path, or bypassing it).
 */

import { describe, expect, it } from "vitest";

import { PostgresProspectService } from "../prospects";
import { makePrismock } from "../../__tests__/make-prismock";

describe("PostgresProspectService + ProspectTheme dual-write", () => {
  it("create() writes matching Prospect flat columns and a ProspectTheme row", async () => {
    const client = makePrismock();
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

    // Flat columns carry the same palette (rollback safety).
    const flat = await client.prospect.findUnique({ where: { id: created.id } });
    expect(flat!.primaryColor).toBe("#FF0000");
    expect(flat!.accentColor).toBe("#00FF00");
  });

  it("update() re-syncs the full ProspectTheme row and the flat columns, not just the changed field", async () => {
    const client = makePrismock();
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
    // Untouched-by-this-update field stays in sync.
    expect(theme!.accentColor).toBe("#00FF00");

    const flat = await client.prospect.findUnique({ where: { id: created.id } });
    expect(flat!.primaryColor).toBe("#0000FF");

    const row = await svc.get(created.id);
    expect(row!.primaryColor).toBe("#0000FF");
    expect(row!.accentColor).toBe("#00FF00");
  });

  it("get()/list() fall back to the flat Prospect columns when no ProspectTheme row exists", async () => {
    // Insert a fully-themed prospect WITHOUT a theme row, bypassing the
    // service - simulating a row written before dual-write existed.
    const client = makePrismock();
    const legacy = await client.prospect.create({
      data: {
        ownerId: "owner-1",
        name: "Legacy Co",
        primaryColor: "#ABCDEF",
        accentColor: "#123456",
      },
    });
    const svc = new PostgresProspectService(client);

    const fetched = await svc.get(legacy.id);
    expect(fetched!.primaryColor).toBe("#ABCDEF");
    expect(fetched!.accentColor).toBe("#123456");

    const [listed] = (await svc.list()).items;
    expect(listed!.primaryColor).toBe("#ABCDEF");
  });
});
