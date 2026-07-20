# Phase 10 - Enrichment adapter + company-level provider

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md` (Enrichment - the four layers and PII guardrails are binding), `../PLAN.md` (EnrichmentProvider contract + the `after()` decision).

## Your role

Build the enrichment layer: the provider adapter interface, a noop provider, an IPinfo-backed company-level provider, and the hook into the ingest route that enriches new sessions post-response. Person-level providers (RB2B/Warmly class) are explicitly NOT wired in v1 - the adapter must make adding one later a one-file change.

One logical PR.

## Wave + dependencies

- Wave 4, after Phase 06 (hooks into the ingest route's session-creation path).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-10-enrichment`, branch `gtm/10-enrichment`.
2. `superpowers:test-driven-development`.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- **Enrichment payloads and raw IPs never appear in logs.** Log only `[enrich] session=<id> provider=<name> outcome=ok|miss|error durMs=<n>`.
- Runs via Next 15 `after()` inside the ingest route, only when a session was newly created (not on subsequent batches). The raw IP is passed in-memory to the provider and dies with the request scope. Nothing PII-bearing enters a queue.
- Enrichment failure never affects the ingest response (it already returned) and leaves `session.enrichment` null - downstream renders "Anonymous" (Phase 08 handles this).
- `IPINFO_TOKEN` unset -> noop provider; the system is fully functional without enrichment.
- Results are written once; do not re-enrich or overwrite non-null `enrichment` (idempotent under batch retries).
- Person-level guardrails from DESIGN.md pre-encoded: the adapter surface takes `country` so a future person-level provider can be geo-gated to US sessions; write the gate helper now (`isPersonLevelEligible(country) => country === "US"`), used by no provider yet.

## Required reading before code changes

- Phase 06's ingest route - the session-creation branch. `services.visitorSessions.upsertFromBatch` returns `{ created: boolean }` per the PLAN.md contract; your hook fires only when `created` is true.
- `../PLAN.md` EnrichmentProvider + EnrichmentResult types (binding).
- IPinfo API docs (https://ipinfo.io/developers) - company/ASN response fields; free-tier field availability.

## What needs to happen

1. **`src/lib/enrichment/`**:
   - `types.ts` - `EnrichmentProvider`, `EnrichmentResult` verbatim from PLAN.md.
   - `noop.ts` - returns null.
   - `ipinfo.ts` - fetch `https://ipinfo.io/{ip}?token=...` (3s timeout); map `org`/`company` fields to `{ company: { name, domain? }, provider: "ipinfo", confidence: "medium", enrichedAt }`; hosting/ISP ASNs (e.g. org strings matching common ISP/cloud patterns - document your heuristic) -> return null (an ISP name is noise, not a company).
   - `index.ts` - `getEnrichmentProvider()`: env-selected; `enrichSession(sessionId, { ip, country })`: provider call + `services.visitorSessions.setEnrichment(sessionId, result)` (add this service method: writes only if currently null).
2. **Ingest hook** (edit Phase 06's route): when `created === true`, `after(() => enrichSession(session.id, { ip, country }))`.
3. **Env**: `IPINFO_TOKEN` (optional) in validation + `.env.example` placeholder.
4. **Docs**: dashboard AGENTS.md - enrichment section: provider selection, PII rules (never logged, retention = row lifetime, raw IP in-request only), how to add a provider, the US geo-gate helper awaiting person-level vendors pending security review.
5. **Tests**: noop path; ipinfo mapping fixtures (company hit, ISP filtered to null, timeout -> null, 429 -> null); write-once semantics; log-content assertion (no IP, no payload); `after()` hook fires only on created sessions (mock).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] System behaves identically with `IPINFO_TOKEN` unset (tests run both modes).
- [ ] Log assertions prove no IP/payload leakage.
- [ ] Adding a hypothetical provider requires only a new file + env switch (demonstrated by the noop/ipinfo symmetry).
- [ ] AGENTS.md updated. spark26 untouched.

## PR title

`feat(dashboard): Phase GTM-10 - enrichment adapter + company-level provider`

## After merge

Update `../PROGRESS.md`. Person-level vendor trial + Fireblocks security review tracked there as a non-blocking decision.

## Out of scope

- Person-level providers/pixels (post-v1, post-security-review). Enrichment UI (Phase 08 renders whatever exists). Re-enrichment/backfill jobs.
