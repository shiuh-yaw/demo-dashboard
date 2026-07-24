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
import { synthesizeProspectConfig } from "@/lib/services/demo-config-mappers/prospect-fallback";
import { checkoutMapper } from "@/lib/services/demo-config-mappers/checkout";
import { earnMapper } from "@/lib/services/demo-config-mappers/earn";
import { remittanceMapper } from "@/lib/services/demo-config-mappers/remittance";
import { tradeMapper } from "@/lib/services/demo-config-mappers/trade";
import { visaDirectMapper } from "@/lib/services/demo-config-mappers/visa-direct";
import { walletMapper } from "@/lib/services/demo-config-mappers/wallet";
import type {
  Prospect,
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
  toStored(record: DemoConfigRecord, prospect: Prospect | null): { ownerId?: string };
}

// Partial - "flow" has no mapper here; apps/flow owns its config directly
// and a "flow" kind lookup falls through to the prospect-fallback branch
// below.
const MAPPERS: Partial<Record<DemoConfigKind, ReadMapper>> = {
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
  const mapper = MAPPERS[kind];

  if (record && record.kind === kind && mapper) {
    const prospect = record.prospectId
      ? await services.prospects.get(record.prospectId)
      : null;

    // Return only the inner config payload (theme + branding + layout + …),
    // not the `Stored<Kind>Config` wrapper. The wrapper's metadata (id, name,
    // createdAt, ownerId) is dashboard-internal; apps only consume the
    // visual config. Critically, `@dynamic-demos/theme/fetchDemoConfig`
    // shallow-merges the response over a kind-shaped fallback — wrapper
    // fields would corrupt that merge.
    const stored = mapper.toStored(record, prospect) as {
      config: unknown;
    };
    return stored.config;
  }

  // Prospect fallback: `?theme=` accepts the brand in any of its
  // identities. When the id isn't a config of this kind, resolve it as
  // a Prospect id - or, for a config of a DIFFERENT kind, borrow its
  // prospect - and synthesize this kind's payload from the prospect's
  // visual fields. A prospect themes every demo the moment it exists;
  // no per-kind DemoConfig row required.
  const prospect = record?.prospectId
    ? await services.prospects.get(record.prospectId)
    : await services.prospects.get(id);
  if (!prospect) {
    throw new NotFoundError("Demo config not found");
  }
  return synthesizeProspectConfig(kind, prospect);
}
