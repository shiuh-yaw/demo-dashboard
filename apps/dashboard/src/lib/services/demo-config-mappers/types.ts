/**
 * Shared types for per-kind demo-config mappers (TD-002 action-layer wiring).
 *
 * Every mapper translates between the kind's legacy `StoredXConfig` shape
 * (still consumed by the dashboard UI + by each demo app's HTTP API) and
 * the unified `DemoConfig` storage shape (`DemoConfigRecord`). Brand
 * resolution flows through the shared `brand-resolver.ts` so action-
 * created and backfill-created rows converge on the same Brand id.
 *
 * The mapper interface is generic over the kind's `Config` and stored
 * shape so each kind keeps its existing TS types unchanged.
 */

import type {
  Brand,
  BrandService,
  CreateDemoConfigInput,
  DemoConfigKind,
  DemoConfigRecord,
  UpdateDemoConfigInput,
} from "../types";

/**
 * Inputs that all kind-specific create mappers accept. `name === null`
 * means "store as NULL in DB"; the outbound mapper surfaces a graceful
 * fallback when reading.
 */
export interface MapperCreateInput<Config> {
  ownerId: string;
  name: string | null;
  description: string | null;
  config: Config;
}

/**
 * Inputs that all kind-specific update mappers accept. Every field is
 * optional — partial updates are the common case from the form layer.
 */
export interface MapperUpdateInput<Config> {
  ownerId: string;
  name?: string | null;
  description?: string | null;
  config?: Partial<Config>;
}

/**
 * Every per-kind mapper must implement this interface. The action layer
 * is generic over the mapper — see `lib/actions/*.ts`.
 */
export interface DemoConfigMapper<Config, Stored> {
  /** Closed-set demo kind discriminator. */
  readonly kind: DemoConfigKind;
  /** Pretty placeholder used when DB stores `name = NULL`. */
  readonly untitledLabel: string;

  /**
   * Build a `CreateDemoConfigInput` from a kind-specific config. Resolves
   * a Brand row first (deterministic id; upsert on miss) so the row's
   * `brandId` FK is populated at create time.
   */
  toCreateInput(
    brands: BrandService,
    input: MapperCreateInput<Config>,
  ): Promise<CreateDemoConfigInput>;

  /**
   * Build an `UpdateDemoConfigInput` from a kind-specific partial
   * update. When the theme's primaryColor changes the mapper re-
   * resolves the Brand so the row's `brandId` follows the new theme.
   */
  toUpdateInput(
    brands: BrandService,
    existing: DemoConfigRecord,
    input: MapperUpdateInput<Config>,
  ): Promise<UpdateDemoConfigInput>;

  /**
   * Project a `DemoConfigRecord` back into the legacy stored shape.
   * `brand` is `null` for the legacy-Redis read fallback (the row was
   * synthesised from a pre-cutover key and predates Brand records).
   */
  toStored(record: DemoConfigRecord, brand: Brand | null): Stored;
}
