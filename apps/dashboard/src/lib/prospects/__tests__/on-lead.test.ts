import { describe, expect, it, vi } from "vitest";
import { handleIdentifiedLead, type HandleIdentifiedLeadDeps } from "../on-lead";
import type { AutoProspectServices } from "../auto-create";
import type { EnrichmentProvider } from "@/lib/enrichment/types";
import type { Prospect } from "@/lib/services/types";

function fakeProvider(companyName: string | null) {
  const calls: string[] = [];
  const provider: EnrichmentProvider = {
    name: "claude",
    async enrich({ domain }) {
      calls.push(domain);
      return companyName
        ? {
            company: { name: companyName },
            provider: "claude",
            confidence: "high",
            enrichedAt: "2026-08-13T00:00:00.000Z",
          }
        : null;
    },
  };
  return { provider, calls };
}

function fakeDeps(companyName: string | null = "Fireblocks") {
  const { provider, calls } = fakeProvider(companyName);
  const created: string[] = [];
  const prospects: AutoProspectServices = {
    async list() {
      return { items: [] };
    },
    async create(input) {
      created.push(input.name);
      return { id: "p1", name: input.name } as Prospect;
    },
    async update(id: string) {
      return { id } as Prospect;
    },
  };
  const setEnrichment = vi.fn(async () => true);
  const deps: HandleIdentifiedLeadDeps = {
    provider,
    visitorSessions: { setEnrichment },
    prospects,
    logger: { info: () => {}, error: () => {} },
  };
  return { calls, created, setEnrichment, deps };
}

describe("handleIdentifiedLead", () => {
  it("resolves the domain ONCE and uses it for both the session and the prospect", async () => {
    const { deps, calls, created, setEnrichment } = fakeDeps("Fireblocks");

    await handleIdentifiedLead(
      { sessionId: "s1", domain: "fireblocks.com" },
      deps,
    );

    // Wiring enrichment and auto-prospect independently would bill two calls
    // per lead for the same answer.
    expect(calls).toEqual(["fireblocks.com"]);
    expect(setEnrichment).toHaveBeenCalledTimes(1);
    expect(created).toEqual(["Fireblocks"]);
  });

  it("skips consumer domains entirely - no lookup, no prospect", async () => {
    const { deps, calls, created, setEnrichment } = fakeDeps();

    await handleIdentifiedLead({ sessionId: "s1", domain: "gmail.com" }, deps);

    expect(calls).toEqual([]);
    expect(setEnrichment).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  });

  it("still creates the prospect when enrichment finds nothing", async () => {
    const { deps, created, setEnrichment } = fakeDeps(null);

    await handleIdentifiedLead(
      { sessionId: "s1", domain: "shipfinex.com" },
      deps,
    );

    expect(setEnrichment).not.toHaveBeenCalled();
    // A lead with no confident company still belongs to a company.
    expect(created).toEqual(["Shipfinex"]);
  });

  it("creates the prospect even when persisting the session enrichment fails", async () => {
    const { deps, created } = fakeDeps("Fireblocks");
    deps.visitorSessions.setEnrichment = vi.fn(async () => {
      throw new Error("db down");
    });

    await handleIdentifiedLead(
      { sessionId: "s1", domain: "fireblocks.com" },
      deps,
    );

    expect(created).toEqual(["Fireblocks"]);
  });

  it("never throws - ingest already returned its response", async () => {
    const { deps } = fakeDeps("Fireblocks");
    deps.prospects.create = async () => {
      throw new Error("db down");
    };

    await expect(
      handleIdentifiedLead({ sessionId: "s1", domain: "fireblocks.com" }, deps),
    ).resolves.toBeUndefined();
  });

  it("logs the domain but never an email address", async () => {
    const { deps } = fakeDeps("Fireblocks");
    const lines: string[] = [];
    deps.logger = {
      info: (l: string) => {
        lines.push(l);
      },
      error: (l: string) => {
        lines.push(l);
      },
    };

    await handleIdentifiedLead(
      { sessionId: "s1", domain: "fireblocks.com" },
      deps,
    );

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain("@");
  });
});
