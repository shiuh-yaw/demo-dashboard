/**
 * Shared types for per-kind demo-config mappers (TD-002 action-layer wiring).
 *
 * Every mapper translates between the kind's legacy `StoredXConfig` shape
 * (still consumed by the dashboard UI + by each demo app's HTTP API) and
 * the unified `DemoConfig` storage shape (`DemoConfigRecord`). Prospect
 * linkage is caller-supplied (`prospectId`) - mappers no longer resolve or
 * create Prospect rows themselves (GTM-03.5B; see `prospect-hydration.ts`
 * for the read-side FK lookup + theme projection that replaces it).
 *
 * The mapper interface is generic over the kind's `Config` and stored
 * shape so each kind keeps its existing TS types unchanged.
 */

import type {
  Prospect,
  ProspectService,
  CreateDemoConfigInput,
  DemoConfigKind,
  DemoConfigRecord,
  UpdateDemoConfigInput,
} from "../types";

/**
 * Inputs that all kind-specific create mappers accept. `name === null`
 * means "store as NULL in DB"; the outbound mapper surfaces a graceful
 * fallback when reading. `prospectId` is explicit and caller-supplied -
 * `null` means "built for" nobody yet (unbound/showcase demo).
 */
export interface MapperCreateInput<Config> {
  ownerId: string;
  /** Resolved internal User id for the creating session's sub - omitted or null when the sub doesn't resolve. */
  createdById?: string | null;
  name: string | null;
  description: string | null;
  prospectId: string | null;
  config: Config;
}

/**
 * Inputs that all kind-specific update mappers accept. Every field is
 * optional — partial updates are the common case from the form layer.
 * `prospectId` explicitly set to `null` unbinds the config from any
 * Prospect; `undefined` leaves the existing link untouched.
 */
export interface MapperUpdateInput<Config> {
  ownerId: string;
  name?: string | null;
  description?: string | null;
  prospectId?: string | null;
  config?: Partial<Config>;
}

/**
 * Every per-kind mapper must implement this interface. The action layer
 * is generic over the mapper - see `lib/actions/*.ts`. `ProspectService`
 * stays a parameter on `toCreateInput`/`toUpdateInput` for signature
 * parity across mappers even though current implementations don't call it
 * (no more resolve-on-write) - keeps the door open for future
 * caller-side validation without another mapper-interface rev.
 */
export interface DemoConfigMapper<Config, Stored> {
  /** Closed-set demo kind discriminator. */
  readonly kind: DemoConfigKind;
  /** Pretty placeholder used when DB stores `name = NULL`. */
  readonly untitledLabel: string;

  /** Build a `CreateDemoConfigInput` from a kind-specific config. */
  toCreateInput(
    prospects: ProspectService,
    input: MapperCreateInput<Config>,
  ): Promise<CreateDemoConfigInput>;

  /** Build an `UpdateDemoConfigInput` from a kind-specific partial update. */
  toUpdateInput(
    prospects: ProspectService,
    existing: DemoConfigRecord,
    input: MapperUpdateInput<Config>,
  ): Promise<UpdateDemoConfigInput>;

  /**
   * Project a `DemoConfigRecord` back into the legacy stored shape.
   * `prospect` is `null` for unbound configs and for the legacy-Redis read
   * fallback (the row predates Prospect records).
   */
  toStored(record: DemoConfigRecord, prospect: Prospect | null): Stored;
}
