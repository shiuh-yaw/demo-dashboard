import { describe, expect, it, vi } from "vitest";
import { createClaudeProvider, type ClaudeMessages } from "./claude";

const NOW = new Date("2026-02-01T00:00:00.000Z");

function fakeMessages(text: string): ClaudeMessages {
  return {
    create: vi.fn().mockResolvedValue({ content: [{ type: "text", text }] }),
  };
}

function provider(text: string) {
  return createClaudeProvider({ messages: fakeMessages(text), now: () => NOW });
}

describe("createClaudeProvider", () => {
  it("maps a high-confidence answer to a company profile", async () => {
    const result = await provider(
      JSON.stringify({
        name: "DBS Bank",
        industry: "Banking",
        sizeBand: "10001+",
        summary: "A Singapore multinational bank.",
        confidence: "high",
      }),
    ).enrich({ domain: "dbs.com.sg" });

    expect(result).toEqual({
      company: {
        name: "DBS Bank",
        domain: "dbs.com.sg",
        industry: "Banking",
        sizeBand: "10001+",
        summary: "A Singapore multinational bank.",
      },
      provider: "claude",
      confidence: "high",
      enrichedAt: NOW.toISOString(),
    });
  });

  it("strips markdown fences before parsing", async () => {
    const result = await provider(
      '```json\n{"name":"Acme","confidence":"medium"}\n```',
    ).enrich({ domain: "acme.io" });
    expect(result?.company?.name).toBe("Acme");
    expect(result?.confidence).toBe("medium");
  });

  it("returns null (a miss) on low confidence - never a fabricated company", async () => {
    const result = await provider(
      JSON.stringify({ confidence: "low" }),
    ).enrich({ domain: "unknown-xyz.io" });
    expect(result).toBeNull();
  });

  it("returns null when the model omits a company name", async () => {
    const result = await provider(
      JSON.stringify({ industry: "Banking", confidence: "high" }),
    ).enrich({ domain: "acme.io" });
    expect(result).toBeNull();
  });

  it("returns null on unparseable output", async () => {
    const result = await provider("not json at all").enrich({
      domain: "acme.io",
    });
    expect(result).toBeNull();
  });
});
