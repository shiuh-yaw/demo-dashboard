/**
 * PostgresShareLinkService - Postgres-only (no legacy Redis equivalent),
 * backed by an in-memory fake of the `prisma.shareLink` / `prisma.demoConfig`
 * / `prisma.prospect` slices.
 */

import { describe, expect, it } from "vitest";

import { PostgresShareLinkService } from "@/lib/services/postgres/share-links";
import {
  DemoConfigNotFoundError,
  ShareLinkProspectNotFoundError,
} from "@/lib/services/types";

import { createFakeShareLinkPrisma } from "./fake-prisma-share-links";

function buildService(
  overrides: Partial<{
    demoConfigIds: string[];
    prospectIds: string[];
    userIds: string[];
  }> = {},
) {
  const client = createFakeShareLinkPrisma({
    demoConfigIds: ["dc_1"],
    prospectIds: ["prospect_1"],
    userIds: ["user_1"],
    ...overrides,
  });
  return { svc: new PostgresShareLinkService(client), client };
}

describe("PostgresShareLinkService", () => {
  it("mint produces a 21-char nanoid token", async () => {
    const { svc } = buildService();
    const link = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    expect(link.token).toHaveLength(21);
    expect(link.status).toBe("active");
    expect(link.demoConfigId).toBe("dc_1");
    expect(link.prospectId).toBe("prospect_1");
    expect(link.userId).toBe("user_1");
  });

  it("mint reuses the active link for the same user + demoConfig + prospect", async () => {
    const { svc } = buildService();
    const input = {
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    };
    const first = await svc.mint(input);
    const second = await svc.mint(input);
    expect(second.id).toBe(first.id);
    expect(second.token).toBe(first.token);
  });

  it("mint creates a fresh link once the prior one is revoked", async () => {
    const { svc } = buildService();
    const input = {
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    };
    const first = await svc.mint(input);
    await svc.revoke(first.id);
    const second = await svc.mint(input);
    expect(second.id).not.toBe(first.id);
    expect(second.token).not.toBe(first.token);
    expect(second.status).toBe("active");
  });

  it("mint keeps links distinct across different prospects", async () => {
    const { svc } = buildService({ prospectIds: ["prospect_1", "prospect_2"] });
    const a = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    const b = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_2",
      userId: "user_1",
    });
    expect(b.id).not.toBe(a.id);
  });

  it("mint throws DemoConfigNotFoundError when the demoConfig doesn't exist", async () => {
    const { svc } = buildService();
    await expect(
      svc.mint({
        demoConfigId: "does-not-exist",
        prospectId: "prospect_1",
        userId: "user_1",
      }),
    ).rejects.toThrow(DemoConfigNotFoundError);
  });

  it("mint throws ShareLinkProspectNotFoundError when the prospect doesn't exist", async () => {
    const { svc } = buildService();
    await expect(
      svc.mint({
        demoConfigId: "dc_1",
        prospectId: "does-not-exist",
        userId: "user_1",
      }),
    ).rejects.toThrow(ShareLinkProspectNotFoundError);
  });

  it("resolveByToken returns the link with user + prospect context for an active token", async () => {
    const { svc } = buildService();
    const minted = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    const resolved = await svc.resolveByToken(minted.token);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(minted.id);
    expect(resolved!.user.id).toBe("user_1");
    expect(resolved!.prospect.id).toBe("prospect_1");
  });

  it("resolveByToken returns null for an unknown token", async () => {
    const { svc } = buildService();
    const resolved = await svc.resolveByToken("unknown-token");
    expect(resolved).toBeNull();
  });

  it("resolveByToken returns null for a revoked link", async () => {
    const { svc } = buildService();
    const minted = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    await svc.revoke(minted.id);
    const resolved = await svc.resolveByToken(minted.token);
    expect(resolved).toBeNull();
  });

  it("resolveByToken returns null for an expired link", async () => {
    const { svc, client } = buildService();
    const minted = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    // Nothing in the ShareLink contract sets expiresAt at mint time - reach
    // into the fake store directly to simulate an already-expired row.
    const row = client.__shareLinks.get(minted.id)!;
    client.__shareLinks.set(minted.id, {
      ...row,
      expiresAt: new Date(Date.now() - 1000),
    });

    const resolved = await svc.resolveByToken(minted.token);
    expect(resolved).toBeNull();
  });

  it("revoke flips status to revoked", async () => {
    const { svc } = buildService();
    const minted = await svc.mint({
      demoConfigId: "dc_1",
      prospectId: "prospect_1",
      userId: "user_1",
    });
    const revoked = await svc.revoke(minted.id);
    expect(revoked.status).toBe("revoked");
  });

  describe("get", () => {
    it("returns the raw link regardless of status", async () => {
      const { svc } = buildService();
      const minted = await svc.mint({
        demoConfigId: "dc_1",
        prospectId: "prospect_1",
        userId: "user_1",
      });
      await svc.revoke(minted.id);
      const found = await svc.get(minted.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe("revoked");
    });

    it("returns null for an unknown id", async () => {
      const { svc } = buildService();
      expect(await svc.get("does-not-exist")).toBeNull();
    });
  });

  describe("findByToken", () => {
    it("returns the raw link for a revoked token (unlike resolveByToken)", async () => {
      const { svc } = buildService();
      const minted = await svc.mint({
        demoConfigId: "dc_1",
        prospectId: "prospect_1",
        userId: "user_1",
      });
      await svc.revoke(minted.id);
      const found = await svc.findByToken(minted.token);
      expect(found).not.toBeNull();
      expect(found!.demoConfigId).toBe("dc_1");
      expect(found!.status).toBe("revoked");
    });

    it("returns the raw link for an expired token", async () => {
      const { svc, client } = buildService();
      const minted = await svc.mint({
        demoConfigId: "dc_1",
        prospectId: "prospect_1",
        userId: "user_1",
      });
      const row = client.__shareLinks.get(minted.id)!;
      client.__shareLinks.set(minted.id, {
        ...row,
        expiresAt: new Date(Date.now() - 1000),
      });
      const found = await svc.findByToken(minted.token);
      expect(found).not.toBeNull();
      expect(found!.demoConfigId).toBe("dc_1");
    });

    it("returns null for an unknown token", async () => {
      const { svc } = buildService();
      expect(await svc.findByToken("unknown-token")).toBeNull();
    });
  });
});
