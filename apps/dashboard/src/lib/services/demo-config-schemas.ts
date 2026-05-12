/**
 * Zod schemas for the unified `DemoConfig` table.
 *
 * Why here (service layer) and not the Prisma schema:
 *   - `kind` stays a Postgres TEXT column with no enum. The meta-system
 *     goal is to add new demo types without a database migration. The
 *     closed set lives in code so a new kind is a TypeScript + Zod
 *     edit, not a `prisma migrate dev`.
 *   - Per-kind config payloads start permissive (`z.record(z.unknown())`).
 *     Strict per-kind schemas land alongside the action-layer wiring
 *     follow-up — the point of this PR is the *table*, not finalised
 *     per-kind payload shapes. The discriminated union still routes on
 *     `kind` so callers can swap in stricter schemas one demo at a time.
 *
 * Consumed by the Postgres + Redis `DemoConfigService` implementations
 * for write-side validation; consumers re-narrow the resulting
 * `config: unknown` field against demo-specific shapes elsewhere.
 */

import { z } from "zod";

import type { DemoConfigKind } from "./types";

/**
 * Closed set of demo kinds. Update here + `DemoConfigKind` in
 * `types.ts` whenever a new demo type lands. No DB migration needed.
 */
export const DEMO_CONFIG_KINDS = [
  "earn",
  "wallet",
  "trade",
  "visa-direct",
  "checkout",
  "remittance",
] as const satisfies readonly DemoConfigKind[];

export const demoConfigKindSchema = z.enum(DEMO_CONFIG_KINDS);

/**
 * Permissive per-kind payload schema. Intentionally accepts any JSON
 * object — strict per-kind schemas land in a follow-up. Keeping the
 * discriminated union in place from day one means swapping a single
 * kind to a strict schema later is a localised edit.
 */
const permissiveConfig = z.record(z.unknown());

const earnConfigSchema = z.object({
  kind: z.literal("earn"),
  config: permissiveConfig,
});

const walletConfigSchema = z.object({
  kind: z.literal("wallet"),
  config: permissiveConfig,
});

const tradeConfigSchema = z.object({
  kind: z.literal("trade"),
  config: permissiveConfig,
});

const visaDirectConfigSchema = z.object({
  kind: z.literal("visa-direct"),
  config: permissiveConfig,
});

const checkoutConfigSchema = z.object({
  kind: z.literal("checkout"),
  config: permissiveConfig,
});

const remittanceConfigSchema = z.object({
  kind: z.literal("remittance"),
  config: permissiveConfig,
});

/**
 * Discriminated union routing by `kind`. Used by the service layer's
 * write paths (`create`, `update`, `upsertWithId`) to validate the
 * payload shape per demo kind before it lands in Postgres or Redis.
 *
 * Both backends call `parseDemoConfigPayload` so parity tests see the
 * same error surface for invalid input regardless of which backend is
 * active.
 */
export const demoConfigPayloadSchema = z.discriminatedUnion("kind", [
  earnConfigSchema,
  walletConfigSchema,
  tradeConfigSchema,
  visaDirectConfigSchema,
  checkoutConfigSchema,
  remittanceConfigSchema,
]);

/**
 * Validate a `(kind, config)` pair against the discriminated union.
 * Throws `ZodError` on shape violations so the service layer can let
 * the error bubble up — callers (server actions, API routes) translate
 * it to a user-facing message.
 *
 * Update payloads with no `config` skip validation: there's nothing to
 * validate against when only `name` or `description` is changing.
 */
export function parseDemoConfigPayload(
  kind: DemoConfigKind,
  config: unknown,
): { kind: DemoConfigKind; config: Record<string, unknown> } {
  return demoConfigPayloadSchema.parse({ kind, config });
}
