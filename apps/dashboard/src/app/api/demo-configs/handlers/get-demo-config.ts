/**
 * Get DemoConfig Handler — unified per-kind read for embed customers + apps.
 *
 * One route to replace per-kind `GET /api/{earns,wallets,trade,visa-direct,checkouts/[id],remittance}`.
 * Storage was unified in PR #81 (D-002); the API was the last layer still
 * pretending each kind was a distinct resource. Apps consume this via
 * `@dynamic-demos/theme`'s `fetchDemoConfig` and fall back to defaults on miss.
 *
 * Public (no auth) — matches the existing checkouts widget read. CORS lives
 * on the route file.
 */

import { z } from "zod";

import { services } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema } from "@/lib/validation";
import { demoConfigKindSchema } from "@/lib/services/demo-config-schemas";
import { checkoutMapper } from "@/lib/services/demo-config-mappers/checkout";
import { earnMapper } from "@/lib/services/demo-config-mappers/earn";
import { remittanceMapper } from "@/lib/services/demo-config-mappers/remittance";
import { tradeMapper } from "@/lib/services/demo-config-mappers/trade";
import { visaDirectMapper } from "@/lib/services/demo-config-mappers/visa-direct";
import { walletMapper } from "@/lib/services/demo-config-mappers/wallet";
import type {
  Brand,
  DemoConfigKind,
  DemoConfigRecord,
} from "@/lib/services/types";

const inputSchema = z.object({
  kind: demoConfigKindSchema,
  id: z.string().min(1),
});

/**
 * Structural dispatch type — every per-kind mapper has the same `toStored`
 * signature even though their create/update input shapes diverge (the
 * checkout mapper adds `mode`, etc.). We only need `toStored` here.
 */
interface ReadMapper {
  toStored(record: DemoConfigRecord, brand: Brand | null): { ownerId?: string };
}

const MAPPERS: Record<DemoConfigKind, ReadMapper> = {
  earn: earnMapper,
  wallet: walletMapper,
  trade: tradeMapper,
  "visa-direct": visaDirectMapper,
  checkout: checkoutMapper,
  remittance: remittanceMapper,
};

export async function handleGetDemoConfig(rawInput: unknown): Promise<unknown> {
  const { kind, id } = parseWithSchema(inputSchema, rawInput);

  const record = await services.demoConfigs.get(id);
  // Kind-mismatch is a 404 rather than a 400: from the caller's
  // `(kind, id)` perspective the resource doesn't exist. A 400 would leak
  // the existence of an id under a different kind.
  if (!record || record.kind !== kind) {
    throw new NotFoundError("Demo config not found");
  }

  const brand = record.brandId
    ? await services.brands.get(record.brandId)
    : null;

  // Return only the inner config payload (theme + branding + layout + …),
  // not the `Stored<Kind>Config` wrapper. The wrapper's metadata (id, name,
  // createdAt, ownerId) is dashboard-internal; apps only consume the
  // visual config. Critically, `@dynamic-demos/theme/fetchDemoConfig`
  // shallow-merges the response over a kind-shaped fallback — wrapper
  // fields would corrupt that merge.
  const stored = MAPPERS[kind].toStored(record, brand) as {
    config: unknown;
  };
  return stored.config;
}
