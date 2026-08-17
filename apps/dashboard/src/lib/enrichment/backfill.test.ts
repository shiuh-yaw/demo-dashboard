import { describe, expect, it, vi } from "vitest";
import { domainOf, enrichSessions } from "./backfill";
import type { EnrichmentProvider, EnrichmentResult } from "./types";

function result(name: string): EnrichmentResult {
  return {
    company: { name, domain: "acme.com" },
    provider: "claude",
    confidence: "high",
    enrichedAt: "2026-08-12T00:00:00.000Z",
  };
}

/** Provider recording every domain it was asked about. */
function fakeProvider(
  enrich: (domain: string) => EnrichmentResult | null,
): EnrichmentProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: "claude",
    calls,
    async enrich({ domain }) {
      calls.push(domain);
      return enrich(domain);
    },
  };
}

/** `wrote` mimics the write guard's verdict (false = nothing was written). Rest
 * args so the recorded calls stay inspectable without unused parameters. */
function fakeService(wrote = true) {
  return {
    setEnrichment: vi.fn(
      async (
        ...__args: [string, EnrichmentResult, { overwrite?: boolean }?]
      ) => wrote,
    ),
  };
}

describe("domainOf", () => {
  it("lowercases the domain part", () => {
    expect(domainOf("Jo@Acme.COM")).toBe("acme.com");
  });

  it("returns null for a missing or malformed address", () => {
    expect(domainOf(null)).toBeNull();
    expect(domainOf("")).toBeNull();
    expect(domainOf("not-an-email")).toBeNull();
    expect(domainOf("jo@")).toBeNull();
  });
});

describe("enrichSessions", () => {
  it("makes ONE provider call per distinct domain and applies it to every session", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    const service = fakeService();

    const run = await enrichSessions(
      [
        { id: "s1", email: "jo@acme.com" },
        { id: "s2", email: "sam@acme.com" },
        { id: "s3", email: "kim@acme.com" },
      ],
      { provider, visitorSessionService: service },
    );

    expect(provider.calls).toEqual(["acme.com"]);
    expect(service.setEnrichment).toHaveBeenCalledTimes(3);
    expect(run.scanned).toBe(3);
    expect(run.eligible).toBe(3);
    expect(run.domains).toBe(1);
    expect(run.enriched).toBe(3);
    expect(run.missed).toBe(0);
    expect(run.errors).toBe(0);
  });

  it("returns the resolved company per domain so callers need no re-read", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));

    const run = await enrichSessions([{ id: "s1", email: "jo@acme.com" }], {
      provider,
      visitorSessionService: fakeService(),
    });

    expect(run.companies.get("acme.com")?.company?.name).toBe("Acme Inc");
  });

  it("counts only writes the write-once guard let through", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    // Row already enriched -> the guard rejects the write.
    const service = fakeService(false);

    const run = await enrichSessions([{ id: "s1", email: "jo@acme.com" }], {
      provider,
      visitorSessionService: service,
    });

    expect(service.setEnrichment).toHaveBeenCalledTimes(1);
    expect(run.enriched).toBe(0);
    // Still resolved - the caller can render it even though nothing was stored.
    expect(run.companies.size).toBe(1);
  });

  it("skips consumer domains without calling the provider", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    const service = fakeService();

    const run = await enrichSessions(
      [
        { id: "s1", email: "jo@gmail.com" },
        { id: "s2", email: "sam@acme.com" },
      ],
      { provider, visitorSessionService: service },
    );

    expect(provider.calls).toEqual(["acme.com"]);
    expect(run.scanned).toBe(2);
    expect(run.eligible).toBe(1);
    expect(run.enriched).toBe(1);
  });

  it("skips sessions with no captured email", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    const service = fakeService();

    const run = await enrichSessions([{ id: "s1", email: null }], {
      provider,
      visitorSessionService: service,
    });

    expect(provider.calls).toEqual([]);
    expect(service.setEnrichment).not.toHaveBeenCalled();
    expect(run).toEqual({
      scanned: 1,
      eligible: 0,
      domains: 0,
      enriched: 0,
      missed: 0,
      errors: 0,
      companies: new Map(),
    });
  });

  it("counts an unidentified domain as a miss and writes nothing", async () => {
    const provider = fakeProvider(() => null);
    const service = fakeService();

    const run = await enrichSessions([{ id: "s1", email: "jo@obscure.dev" }], {
      provider,
      visitorSessionService: service,
    });

    expect(service.setEnrichment).not.toHaveBeenCalled();
    expect(run.missed).toBe(1);
    expect(run.enriched).toBe(0);
  });

  it("a throwing domain counts as an ERROR (not a miss) and never fails the rest of the run", async () => {
    const provider = fakeProvider((domain) => {
      if (domain === "broken.com") throw new Error("provider exploded");
      return result("Acme Inc");
    });
    const service = fakeService();
    const errors: string[] = [];

    const run = await enrichSessions(
      [
        { id: "s1", email: "jo@broken.com" },
        { id: "s2", email: "sam@acme.com" },
      ],
      {
        provider,
        visitorSessionService: service,
        logger: { info: () => {}, error: (l) => errors.push(l) },
      },
    );

    // An outage must never be reported to the operator as "no confident match".
    expect(run.errors).toBe(1);
    expect(run.missed).toBe(0);
    expect(run.enriched).toBe(1);
    expect(errors).toHaveLength(1);
    // Only the healthy domain's session was written.
    expect(service.setEnrichment.mock.calls.map((c) => c[0])).toEqual(["s2"]);
  });

  it("never logs an email or a domain", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    const lines: string[] = [];

    await enrichSessions([{ id: "s1", email: "jo@acme.com" }], {
      provider,
      visitorSessionService: fakeService(),
      logger: { info: (l) => lines.push(l), error: (l) => lines.push(l) },
    });

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toContain("acme.com");
      expect(line).not.toContain("jo@");
    }
  });

  it("is a no-op for an empty input", async () => {
    const provider = fakeProvider(() => result("Acme Inc"));
    const run = await enrichSessions([], {
      provider,
      visitorSessionService: fakeService(),
    });
    expect(provider.calls).toEqual([]);
    expect(run.scanned).toBe(0);
  });
});
