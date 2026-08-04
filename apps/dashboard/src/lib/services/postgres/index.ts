/**
 * Postgres service-layer implementations — the canonical backend for
 * prospects, demo configs, transaction records, webhook events, and the
 * GTM stores (users, teams, share links, visitor sessions, analytics).
 * Instantiated in `../index.ts`.
 *
 * D-015: only `apps/dashboard` may import `@dynamic-demos/db`. Other apps
 * fetch via the dashboard HTTP API.
 */
export { PostgresProspectService } from "./prospects";
export { PostgresContactService } from "./contacts";
