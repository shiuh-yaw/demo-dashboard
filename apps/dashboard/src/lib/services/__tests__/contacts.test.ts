import { describe, it, expect } from "vitest";
import { PostgresContactService } from "../postgres/contacts";
import type { PrismaClient } from "@dynamic-demos/db";

interface ContactRow {
  id: string;
  email: string;
  dynamicUserId: string | null;
  notifiedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  sightingCount: number;
}

interface AppearanceRow {
  id: string;
  contactId: string;
  demoSlug: string;
  prospectId: string | null;
  firstSeenAt: Date;
}

/** Minimal Prisma slice `PostgresContactService` touches: contact
 *  upsert/updateMany, contactAppearance findFirst/create. */
interface ContactsPrismaClient {
  contact: {
    upsert(args: {
      where: { email: string };
      create: { email: string; dynamicUserId: string | null; sightingCount: number };
      update: { lastSeenAt: Date; sightingCount: { increment: number } };
    }): Promise<ContactRow>;
    updateMany(args: {
      where: { email: string; notifiedAt: null };
      data: { notifiedAt: Date };
    }): Promise<{ count: number }>;
  };
  contactAppearance: {
    findFirst(args: {
      where: { contactId: string; demoSlug: string; prospectId: string | null };
    }): Promise<AppearanceRow | null>;
    create(args: {
      data: { contactId: string; demoSlug: string; prospectId: string | null };
    }): Promise<AppearanceRow>;
  };
}

function fakePrisma() {
  const contacts: ContactRow[] = [];
  const appearances: AppearanceRow[] = [];
  let seq = 0;
  const client: ContactsPrismaClient = {
    contact: {
      async upsert({ where, create, update }) {
        let c = contacts.find((x) => x.email === where.email);
        if (!c) {
          const now = new Date();
          c = { id: `c${++seq}`, notifiedAt: null, firstSeenAt: now, lastSeenAt: now, ...create };
          contacts.push(c);
        } else {
          c.lastSeenAt = update.lastSeenAt;
          c.sightingCount += update.sightingCount.increment;
        }
        return { ...c };
      },
      async updateMany({ where, data }) {
        const c = contacts.find((x) => x.email === where.email && x.notifiedAt === null);
        if (!c) return { count: 0 };
        c.notifiedAt = data.notifiedAt;
        return { count: 1 };
      },
    },
    contactAppearance: {
      async findFirst({ where }) {
        return (
          appearances.find(
            (a) =>
              a.contactId === where.contactId &&
              a.demoSlug === where.demoSlug &&
              a.prospectId === where.prospectId,
          ) ?? null
        );
      },
      async create({ data }) {
        const a: AppearanceRow = { id: `a${++seq}`, firstSeenAt: new Date(), ...data };
        appearances.push(a);
        return { ...a };
      },
    },
  };
  return { client, contacts, appearances };
}

describe("PostgresContactService.recordSighting", () => {
  it("creates the contact + appearance and claims the notification on first sighting", async () => {
    const { client } = fakePrisma();
    const svc = new PostgresContactService(client as unknown as PrismaClient);
    const r = await svc.recordSighting({ email: "a@b.com", dynamicUserId: "d1", demoSlug: "wallet", prospectId: null });
    expect(r.shouldNotify).toBe(true);
    expect(r.contact.email).toBe("a@b.com");
    expect(r.appearance.demoSlug).toBe("wallet");
  });

  it("does not re-notify a known email, and adds a new appearance for a new demo/prospect", async () => {
    const { client, appearances } = fakePrisma();
    const svc = new PostgresContactService(client as unknown as PrismaClient);
    await svc.recordSighting({ email: "a@b.com", demoSlug: "wallet", prospectId: null });
    const second = await svc.recordSighting({ email: "a@b.com", demoSlug: "trade", prospectId: "p1" });
    expect(second.shouldNotify).toBe(false);
    expect(appearances).toHaveLength(2);
  });

  it("tracks sightingCount + lastSeenAt across sightings without disturbing first-seen fields", async () => {
    const { client } = fakePrisma();
    const svc = new PostgresContactService(client as unknown as PrismaClient);
    const first = await svc.recordSighting({
      email: "a@b.com",
      dynamicUserId: "d1",
      demoSlug: "wallet",
      prospectId: null,
    });
    expect(first.contact.sightingCount).toBe(1);
    const firstSeenAt = first.contact.firstSeenAt;
    const dynamicUserId = first.contact.dynamicUserId;

    const second = await svc.recordSighting({
      email: "a@b.com",
      demoSlug: "trade",
      prospectId: "p1",
    });
    expect(second.shouldNotify).toBe(false);
    expect(second.contact.sightingCount).toBe(2);
    expect(second.contact.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
      first.contact.lastSeenAt.getTime(),
    );
    expect(second.contact.firstSeenAt).toEqual(firstSeenAt);
    expect(second.contact.dynamicUserId).toBe(dynamicUserId);
  });

  it("dedups the same (contact, demo, prospect) sighting - including null prospect", async () => {
    const { client, appearances } = fakePrisma();
    const svc = new PostgresContactService(client as unknown as PrismaClient);
    await svc.recordSighting({ email: "a@b.com", demoSlug: "wallet", prospectId: null });
    await svc.recordSighting({ email: "a@b.com", demoSlug: "wallet", prospectId: null });
    expect(appearances).toHaveLength(1);
  });
});
