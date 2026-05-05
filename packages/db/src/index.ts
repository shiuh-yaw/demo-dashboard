/**
 * @dynamic-demos/db — Postgres access layer (Prisma + Supabase).
 *
 * Public surface (stable):
 *   - `prisma`        — serverless-safe singleton client.
 *   - Re-exports `Prisma` (namespace) and `PrismaClient` from `@prisma/client`
 *     so consumers can type input/output objects without importing
 *     `@prisma/client` directly.
 *
 * Hard rule (D-015): only `apps/dashboard` may import from this package.
 * Demo apps fetch from the dashboard API; they never touch Postgres.
 *
 * Phase 2 scaffold: no models yet. Subsequent PRs add Brand, demo configs,
 * Transaction, and WebhookEvent.
 */
export { prisma } from "./client";
export { Prisma, PrismaClient } from "@prisma/client";
