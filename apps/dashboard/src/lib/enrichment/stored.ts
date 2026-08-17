/**
 * How a stored `VisitorSession.enrichment` value is interpreted. Shared by the
 * analytics read layer and the write path so a single definition of "this row
 * already has a company" governs both.
 *
 * The mismatch this prevents: eligibility once asked "is a company readable?"
 * while the write guard asked "is the column NULL?". A row holding legacy IP /
 * geo enrichment with no company answered yes to the first and no to the
 * second, so it was enriched (a paid model call) and then silently refused.
 */

/** Enrichment projected to the PII-safe company surface (never any raw IP). */
export interface StoredCompany {
  name: string | null;
  domain: string | null;
  industry?: string | null;
  sizeBand?: string | null;
  summary?: string | null;
}

/**
 * Defensive reader. `enrichment` is opaque Json; this tolerates every shape
 * written across phases (`{ company: { name, domain, ... } }`,
 * `{ company: "Acme" }`, `{ companyName, companyDomain }`, ipinfo `{ org }`)
 * and returns null when nothing company-like is present. Raw IP / geo fields
 * are never read.
 */
export function readStoredCompany(enrichment: unknown): StoredCompany | null {
  if (!enrichment || typeof enrichment !== "object") return null;
  const e = enrichment as Record<string, unknown>;
  let name: string | null = null;
  let domain: string | null = null;
  let industry: string | null = null;
  let sizeBand: string | null = null;
  let summary: string | null = null;

  const c = e.company;
  if (typeof c === "string") {
    name = c;
  } else if (c && typeof c === "object") {
    const co = c as Record<string, unknown>;
    if (typeof co.name === "string") name = co.name;
    if (typeof co.domain === "string") domain = co.domain;
    if (typeof co.industry === "string") industry = co.industry;
    if (typeof co.sizeBand === "string") sizeBand = co.sizeBand;
    if (typeof co.summary === "string") summary = co.summary;
  }
  if (!name && typeof e.companyName === "string") name = e.companyName;
  if (!domain && typeof e.companyDomain === "string") domain = e.companyDomain;
  if (!name && typeof e.org === "string") name = e.org;

  if (!name && !domain) return null;
  return { name, domain, industry, sizeBand, summary };
}

/** Whether a stored value already carries a company - the ONE predicate both
 * the eligibility read and the write guard must agree on. */
export function hasStoredCompany(enrichment: unknown): boolean {
  return readStoredCompany(enrichment) !== null;
}
