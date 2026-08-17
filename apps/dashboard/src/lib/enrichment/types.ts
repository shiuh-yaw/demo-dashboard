/**
 * Enrichment adapter contract - Phase GTM-10. A provider turns a business
 * email DOMAIN into a company profile; the domain comes from the viewer's
 * captured identity (identify()), never from the IP. Adding a provider is a
 * new file implementing `EnrichmentProvider` plus an env-selector branch in
 * `index.ts` - never a change to this file.
 */

export interface EnrichmentProvider {
  name: string;
  /** Resolve a company email domain (e.g. "dbs.com.sg") to a profile, or null. */
  enrich(input: { domain: string }): Promise<EnrichmentResult | null>;
}

export type EnrichmentResult = {
  company?: {
    name: string;
    domain?: string;
    /** e.g. "Banking", "Fintech", "Retail" - omitted when unknown. */
    industry?: string;
    /** Employee-count band, e.g. "1-10", "51-200", "10001+" - omitted when unknown. */
    sizeBand?: string;
    /** One-sentence "what they do" blurb for the prospect card. */
    summary?: string;
  };
  provider: string;
  confidence: "low" | "medium" | "high";
  enrichedAt: string; // ISO
};
