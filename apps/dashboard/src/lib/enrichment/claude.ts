/**
 * Claude-backed enrichment provider (Phase GTM-10): resolves a business email
 * DOMAIN to a company profile via the Anthropic SDK, replacing the third-party
 * IPinfo vendor. Only the domain is sent to the model - never the full email.
 *
 * `claude-sonnet-5` with ADAPTIVE thinking - unlike `extract-theme.ts`'s
 * mechanical extraction, identifying a company from a domain and rating that
 * confidence is a reasoning task. Measured: with thinking disabled,
 * `dynamic.xyz` self-reports "low" and is dropped; with adaptive it resolves
 * at "medium". Thinking does NOT loosen the fabrication guard - an invented
 * domain still comes back "low" either way. `max_tokens` has headroom because
 * thinking tokens draw from the same budget.
 *
 * Unknown domains must come back as a miss (null / low confidence), never a
 * fabricated profile.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { EnrichmentProvider, EnrichmentResult } from "./types";

/** Injectable slice of the Anthropic client so tests can pass a fake. */
export interface ClaudeMessages {
  create(args: {
    model: string;
    max_tokens: number;
    thinking: { type: "adaptive" };
    messages: { role: "user"; content: string }[];
  }): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

const PROMPT = (domain: string) => `You are enriching a B2B lead from their company email domain: "${domain}".

Return ONLY a JSON object describing the company that owns this domain:
{
  "name": "official company name",
  "industry": "one or two words, e.g. Banking, Fintech, Retail",
  "sizeBand": "employee-count band: 1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1001-5000 | 5001-10000 | 10001+",
  "summary": "one sentence on what the company does",
  "confidence": "high | medium | low"
}

Rules:
- If you do not recognize the domain or are unsure who owns it, return {"confidence":"low"} with no other fields. NEVER invent a company, industry, size, or summary.
- Set "confidence" to how sure you are of the identification.
- Return ONLY the JSON object, no markdown, no explanation.`;

interface RawProfile {
  name?: unknown;
  industry?: unknown;
  sizeBand?: unknown;
  summary?: unknown;
  confidence?: unknown;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function createClaudeProvider(opts: {
  apiKey?: string;
  messages?: ClaudeMessages;
  now?: () => Date;
}): EnrichmentProvider {
  const now = opts.now ?? (() => new Date());
  // The pinned SDK (0.71.2) predates adaptive thinking in its TYPES - its
  // `thinking` union is enabled|disabled - while the API itself accepts
  // `adaptive` on this model. `ClaudeMessages` above describes the real
  // contract; drop this cast when the SDK is upgraded.
  const messages: ClaudeMessages =
    opts.messages ??
    (new Anthropic({ apiKey: opts.apiKey })
      .messages as unknown as ClaudeMessages);

  return {
    name: "claude",
    async enrich({ domain }) {
      const res = await messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: PROMPT(domain) }],
      });

      const block = res.content.find((b) => b.type === "text");
      const raw = block && "text" in block ? block.text : undefined;
      const text = typeof raw === "string" ? raw.trim() : undefined;
      if (!text) return null;

      let jsonText = text;
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      let parsed: RawProfile;
      try {
        parsed = JSON.parse(jsonText) as RawProfile;
      } catch {
        return null;
      }

      const confidence =
        parsed.confidence === "high" || parsed.confidence === "medium"
          ? parsed.confidence
          : "low";
      const name = str(parsed.name);

      // Confidence gate: a low-confidence or nameless answer is a miss, not a
      // guessed profile. Persisting only medium/high keeps hallucinated
      // companies out of the prospect surfaces.
      if (confidence === "low" || !name) return null;

      return {
        company: {
          name,
          domain,
          industry: str(parsed.industry),
          sizeBand: str(parsed.sizeBand),
          summary: str(parsed.summary),
        },
        provider: "claude",
        confidence,
        enrichedAt: now().toISOString(),
      } satisfies EnrichmentResult;
    },
  };
}
