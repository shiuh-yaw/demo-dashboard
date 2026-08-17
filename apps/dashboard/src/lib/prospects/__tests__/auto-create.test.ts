import { describe, expect, it, vi } from "vitest";
import {
  ensureProspectForDomain,
  nameFromDomain,
  type AutoProspectServices,
} from "../auto-create";
import type { EnrichmentProvider } from "@/lib/enrichment/types";
import type { CreateProspectInput, Prospect } from "@/lib/services/types";

function prospect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "p1",
    ownerId: null,
    teamId: null,
    createdById: null,
    status: "AUTO",
    name: "Acme",
    domain: "acme.com",
    createdAt: new Date("2026-08-13T00:00:00Z"),
    updatedAt: new Date("2026-08-13T00:00:00Z"),
  } as Prospect;
}

/** Records creates and serves a fixed set of existing rows. */
function fakeProspects(existing: Prospect[] = []) {
  const created: CreateProspectInput[] = [];
  const svc: AutoProspectServices = {
    async list({ where }) {
      return { items: existing.filter((p) => p.domain === where.domain) };
    },
    async create(input) {
      created.push(input);
      return prospect({ id: "new", name: input.name, domain: input.domain });
    },
    // The background branding import is fire-and-forget; the fake only has to
    // satisfy the service shape.
    async update(id: string) {
      return prospect({ id });
    },
  };
  return { svc, created };
}

/** The branding import is deferred via Next `after()`, which needs a request
 * scope these unit tests do not have. */
const NO_SCHEDULE = () => {};

function fakeProvider(name: string | null): EnrichmentProvider {
  return {
    name: "claude",
    async enrich() {
      return name
        ? {
            company: { name },
            provider: "claude",
            confidence: "high",
            enrichedAt: "2026-08-13T00:00:00.000Z",
          }
        : null;
    },
  };
}

describe("nameFromDomain", () => {
  it("title-cases the first label", () => {
    expect(nameFromDomain("shipfinex.com")).toBe("Shipfinex");
    expect(nameFromDomain("aleo.org")).toBe("Aleo");
  });
});

describe("ensureProspectForDomain", () => {
  it("creates an UNOWNED AUTO prospect for a business domain", async () => {
    const { svc, created } = fakeProspects();

    const out = await ensureProspectForDomain("shipfinex.com", { prospects: svc, schedule: NO_SCHEDULE });

    expect(out.status).toBe("created");
    expect(created).toHaveLength(1);
    // The row must be claimable, which means no owner, no team, AUTO status.
    expect(created[0]).toMatchObject({
      ownerId: null,
      teamId: null,
      createdById: null,
      status: "AUTO",
      domain: "shipfinex.com",
    });
  });

  it("never creates a company for a consumer email domain", async () => {
    const { svc, created } = fakeProspects();

    for (const domain of ["gmail.com", "outlook.com", "icloud.com"]) {
      expect((await ensureProspectForDomain(domain, { prospects: svc, schedule: NO_SCHEDULE })).status).toBe(
        "skipped",
      );
    }
    expect(created).toEqual([]);
  });

  it("reuses an existing prospect on that domain instead of duplicating", async () => {
    const existing = prospect({ id: "curated", status: "ACTIVE", ownerId: "dyn-1" });
    const { svc, created } = fakeProspects([existing]);

    const out = await ensureProspectForDomain("acme.com", { prospects: svc, schedule: NO_SCHEDULE });

    expect(out).toEqual({ status: "matched", prospect: existing });
    expect(created).toEqual([]);
  });

  it("matches case-insensitively so ACME.COM does not create a second row", async () => {
    const { svc, created } = fakeProspects([prospect({ id: "curated" })]);

    expect((await ensureProspectForDomain("ACME.COM", { prospects: svc, schedule: NO_SCHEDULE })).status).toBe(
      "matched",
    );
    expect(created).toEqual([]);
  });

  it("names the prospect from enrichment when available", async () => {
    const { svc, created } = fakeProspects();

    await ensureProspectForDomain("fireblocks.com", {
      prospects: svc,
      schedule: NO_SCHEDULE,
      provider: fakeProvider("Fireblocks"),
    });

    expect(created[0]!.name).toBe("Fireblocks");
  });

  it("falls back to the domain name when enrichment finds nothing", async () => {
    const { svc, created } = fakeProspects();

    await ensureProspectForDomain("shipfinex.com", {
      prospects: svc,
      schedule: NO_SCHEDULE,
      provider: fakeProvider(null),
    });

    expect(created[0]!.name).toBe("Shipfinex");
  });

  it("still creates the prospect when the provider throws", async () => {
    const { svc, created } = fakeProspects();
    const exploding: EnrichmentProvider = {
      name: "claude",
      async enrich() {
        throw new Error("provider down");
      },
    };

    const out = await ensureProspectForDomain("shipfinex.com", {
      prospects: svc,
      schedule: NO_SCHEDULE,
      provider: exploding,
      logger: { info: () => {}, error: () => {} },
    });

    expect(out.status).toBe("created");
    expect(created[0]!.name).toBe("Shipfinex");
  });

  it("skips a malformed domain", async () => {
    const { svc, created } = fakeProspects();
    for (const domain of ["", "   ", "nodot"]) {
      expect((await ensureProspectForDomain(domain, { prospects: svc, schedule: NO_SCHEDULE })).status).toBe(
        "skipped",
      );
    }
    expect(created).toEqual([]);
  });

  it("logs no email or local-part", async () => {
    const { svc } = fakeProspects();
    const lines: string[] = [];

    await ensureProspectForDomain("shipfinex.com", {
      prospects: svc,
      schedule: NO_SCHEDULE,
      logger: { info: (l) => lines.push(l), error: (l) => lines.push(l) },
    });

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain("@");
  });
});
