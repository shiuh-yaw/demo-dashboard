/**
 * Postgres service-layer implementations.
 *
 * Sibling of `../redis/`. Phase 2 scaffold — empty by design.
 *
 * As each per-demo-type migration lands, the corresponding Postgres-backed
 * service module appears here (e.g., `brands.ts`, `remittance.ts`,
 * `transactions.ts`) implementing the contracts defined in
 * `../types.ts`. Until then there is nothing to export.
 *
 * Service-abstraction routing (Redis vs Postgres) lives in
 * `../index.ts` and gates on per-record feature flags (e.g.,
 * `USE_POSTGRES_BRANDS`) so a flip is reversible without code changes.
 *
 * D-015: only `apps/dashboard` may import `@dynamic-demos/db`. Other apps
 * fetch via the dashboard HTTP API.
 */
export {};
