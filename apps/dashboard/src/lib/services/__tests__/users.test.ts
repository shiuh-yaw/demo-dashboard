/**
 * PostgresGtmUserService - Postgres-only (no legacy Redis equivalent),
 * backed by an in-memory fake of the `prisma.user` delegate.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { PostgresGtmUserService } from "@/lib/services/postgres/users";
import {
  DynamicUserIdConflictError,
  InvalidSchedulingUrlError,
} from "@/lib/services/types";

import { createFakeUserPrisma } from "./fake-prisma-users";

describe("PostgresGtmUserService", () => {
  let svc: PostgresGtmUserService;

  beforeEach(() => {
    svc = new PostgresGtmUserService(createFakeUserPrisma());
  });

  it("creates a user with the schema default role (MEMBER) and dynamicUserId null on first getOrCreateByEmail", async () => {
    const user = await svc.getOrCreateByEmail("se@example.com");
    expect(user.email).toBe("se@example.com");
    expect(user.role).toBe("MEMBER");
    expect(user.dynamicUserId).toBeNull();
    expect(user.id).toEqual(expect.any(String));
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("getOrCreateByEmail is idempotent - second call returns the same row", async () => {
    const first = await svc.getOrCreateByEmail("se@example.com");
    const second = await svc.getOrCreateByEmail("se@example.com");
    expect(second.id).toBe(first.id);
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
  });

  it("normalizes email to lowercase on create and on lookup", async () => {
    const created = await svc.getOrCreateByEmail("Se@Example.com");
    expect(created.email).toBe("se@example.com");

    const lookedUp = await svc.getOrCreateByEmail("SE@EXAMPLE.COM");
    expect(lookedUp.id).toBe(created.id);
    expect(lookedUp.email).toBe("se@example.com");
  });

  it("trims whitespace before normalizing email", async () => {
    const created = await svc.getOrCreateByEmail("  se@example.com  ");
    expect(created.email).toBe("se@example.com");
  });

  it("update sets displayName, schedulingUrl, avatarUrl", async () => {
    const created = await svc.getOrCreateByEmail("se@example.com");
    const updated = await svc.update(created.id, {
      displayName: "Sam SE",
      schedulingUrl: "https://cal.com/sam",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(updated.displayName).toBe("Sam SE");
    expect(updated.schedulingUrl).toBe("https://cal.com/sam");
    expect(updated.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("update rejects a javascript: schedulingUrl", async () => {
    const created = await svc.getOrCreateByEmail("se@example.com");
    await expect(
      svc.update(created.id, { schedulingUrl: "javascript:alert(1)" }),
    ).rejects.toThrow(InvalidSchedulingUrlError);
  });

  it("update rejects an http:// schedulingUrl", async () => {
    const created = await svc.getOrCreateByEmail("se@example.com");
    await expect(
      svc.update(created.id, { schedulingUrl: "http://cal.com/sam" }),
    ).rejects.toThrow(InvalidSchedulingUrlError);
  });

  it("update accepts clearing schedulingUrl with null", async () => {
    const created = await svc.getOrCreateByEmail("se@example.com");
    await svc.update(created.id, { schedulingUrl: "https://cal.com/sam" });
    const cleared = await svc.update(created.id, { schedulingUrl: null });
    expect(cleared.schedulingUrl).toBeNull();
  });

  it("setRole flips role to an enum-typed value (ADMIN)", async () => {
    const created = await svc.getOrCreateByEmail("se@example.com");
    const promoted = await svc.setRole(created.id, "ADMIN");
    expect(promoted.role).toBe("ADMIN");
  });

  it("get returns null for an unknown id", async () => {
    const found = await svc.get("does-not-exist");
    expect(found).toBeNull();
  });

  it("getOrCreateByEmail returns the existing row (created=false path) when a concurrent create wins the race", async () => {
    // Simulate a concurrent request that already inserted the User row
    // for this email between our (removed) pre-check and our own
    // `create` call - the fake's `create` enforces the email-uniqueness
    // constraint the same way Postgres does, so our attempt throws P2002
    // and the service must fall back to reading the winner's row instead
    // of throwing.
    const client = createFakeUserPrisma();
    client.__users.set("user_winner", {
      id: "user_winner",
      email: "se@example.com",
      dynamicUserId: null,
      displayName: null,
      avatarUrl: null,
      schedulingUrl: null,
      role: "MEMBER",
      deactivatedAt: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    const raced = new PostgresGtmUserService(client);

    const user = await raced.getOrCreateByEmail("se@example.com");
    expect(user.id).toBe("user_winner");
    expect(user.createdAt.getTime()).toBe(0);
  });

  describe("dynamicUserId write-once (GTM-D-002)", () => {
    it("sets dynamicUserId when currently null", async () => {
      const created = await svc.getOrCreateByEmail("se@example.com");
      expect(created.dynamicUserId).toBeNull();

      const updated = await svc.update(created.id, {
        dynamicUserId: "dynamic-sub-123",
      });
      expect(updated.dynamicUserId).toBe("dynamic-sub-123");
    });

    it("allows re-writing the same dynamicUserId value (idempotent)", async () => {
      const created = await svc.getOrCreateByEmail("se@example.com");
      await svc.update(created.id, { dynamicUserId: "dynamic-sub-123" });
      const updated = await svc.update(created.id, {
        dynamicUserId: "dynamic-sub-123",
      });
      expect(updated.dynamicUserId).toBe("dynamic-sub-123");
    });

    it("rejects overwriting a non-null dynamicUserId with a different value", async () => {
      const created = await svc.getOrCreateByEmail("se@example.com");
      await svc.update(created.id, { dynamicUserId: "dynamic-sub-123" });

      await expect(
        svc.update(created.id, { dynamicUserId: "dynamic-sub-456" }),
      ).rejects.toThrow(DynamicUserIdConflictError);

      // The original value is unchanged after the rejected attempt.
      const unchanged = await svc.get(created.id);
      expect(unchanged?.dynamicUserId).toBe("dynamic-sub-123");
    });
  });

  describe("resolveByDynamicIds", () => {
    it("resolves known subs to their users, keyed by dynamicUserId", async () => {
      const a = await svc.getOrCreateByEmail("a@example.com");
      const b = await svc.getOrCreateByEmail("b@example.com");
      await svc.update(a.id, { dynamicUserId: "sub-a" });
      await svc.update(b.id, { dynamicUserId: "sub-b" });

      const resolved = await svc.resolveByDynamicIds(["sub-a", "sub-b"]);
      expect(resolved.size).toBe(2);
      expect(resolved.get("sub-a")?.id).toBe(a.id);
      expect(resolved.get("sub-b")?.id).toBe(b.id);
    });

    it("omits unknown subs from the returned map", async () => {
      const a = await svc.getOrCreateByEmail("a@example.com");
      await svc.update(a.id, { dynamicUserId: "sub-a" });

      const resolved = await svc.resolveByDynamicIds(["sub-a", "sub-unknown"]);
      expect(resolved.size).toBe(1);
      expect(resolved.has("sub-unknown")).toBe(false);
      expect(resolved.get("sub-a")?.id).toBe(a.id);
    });

    it("returns an empty map for an empty input array without querying", async () => {
      const resolved = await svc.resolveByDynamicIds([]);
      expect(resolved.size).toBe(0);
    });
  });

  describe("claimLegacyRecords (Phase 03.5)", () => {
    it("claims prospect + demo-config rows whose ownerId matches the sub, and reports counts", async () => {
      const client = createFakeUserPrisma();
      client.__prospects.set("p1", {
        id: "p1",
        ownerId: "sub-a",
        createdById: null,
      });
      client.__prospects.set("p2", {
        id: "p2",
        ownerId: "sub-other",
        createdById: null,
      });
      client.__demoConfigs.set("d1", {
        id: "d1",
        ownerId: "sub-a",
        createdById: null,
      });
      const raced = new PostgresGtmUserService(client);

      const result = await raced.claimLegacyRecords({
        id: "user-a",
        dynamicUserId: "sub-a",
      });
      expect(result).toEqual({ prospects: 1, demoConfigs: 1 });
      expect(client.__prospects.get("p1")!.createdById).toBe("user-a");
      // Non-matching owner untouched.
      expect(client.__prospects.get("p2")!.createdById).toBeNull();
    });

    it("is idempotent - a second run claims nothing", async () => {
      const client = createFakeUserPrisma();
      client.__prospects.set("p1", {
        id: "p1",
        ownerId: "sub-a",
        createdById: null,
      });
      const raced = new PostgresGtmUserService(client);
      const first = await raced.claimLegacyRecords({
        id: "user-a",
        dynamicUserId: "sub-a",
      });
      const second = await raced.claimLegacyRecords({
        id: "user-a",
        dynamicUserId: "sub-a",
      });
      expect(first).toEqual({ prospects: 1, demoConfigs: 0 });
      expect(second).toEqual({ prospects: 0, demoConfigs: 0 });
    });

    it("no-ops (zero counts) when dynamicUserId is null", async () => {
      const client = createFakeUserPrisma();
      client.__prospects.set("p1", {
        id: "p1",
        ownerId: "sub-a",
        createdById: null,
      });
      const raced = new PostgresGtmUserService(client);
      const result = await raced.claimLegacyRecords({
        id: "user-a",
        dynamicUserId: null,
      });
      expect(result).toEqual({ prospects: 0, demoConfigs: 0 });
      expect(client.__prospects.get("p1")!.createdById).toBeNull();
    });
  });
});
