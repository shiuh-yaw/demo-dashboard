/**
 * Service Layer Types
 *
 * Interface definitions for the service abstraction layer.
 * This allows swapping between Redis and Prisma implementations.
 */

import type { TransactionState } from "@dynamic-demos/transactions";
import type { Prisma, Contact, ContactAppearance } from "@dynamic-demos/db";

import type {
  Transaction,
  TransactionStatus,
  InitializeTransactionInput,
  AddRouteDataInput,
  User,
  UserWallet,
  Stats,
  StoredCheckoutConfig,
  PaginatedResponse,
} from "@/lib/types/dashboard";

// =============================================================================
// Shared Pagination Contract
// =============================================================================
//
// Cursor-based keyset pagination used by every scoped `list` method added in
// the data-layer rewrite. Ordering is fixed at (updatedAt desc, id desc); the
// cursor is opaque - callers never decode it themselves. See
// `postgres/pagination.ts` for the codec + Prisma args builder.

/** One page of a cursor-paginated list. `nextCursor` is null on the last page. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Common paging inputs accepted by scoped `list` methods. */
export interface PageOptions {
  /** Clamped server-side to [1, MAX_PAGE_LIMIT]; defaults to DEFAULT_PAGE_LIMIT. */
  limit?: number;
  /** Opaque cursor from a previous page's `nextCursor`; omit for the first page. */
  cursor?: string | null;
}

// =============================================================================
// Transaction Service
// =============================================================================

export interface TransactionListOptions {
  page?: number;
  pageSize?: number;
  status?: TransactionStatus | TransactionStatus[];
  userId?: string;
  walletAddress?: string;
  externalId?: string;
}

export interface TransactionService {
  // ===========================================================================
  // Lifecycle Methods (explicit state transitions)
  // ===========================================================================

  /**
   * Initialize a new transaction (server-side only)
   * Creates a transaction with externalId/metadata before user interaction
   * Transition: [none] → initialized
   */
  initialize(input: InitializeTransactionInput): Promise<Transaction>;

  /**
   * Add route data to an initialized transaction
   * Called when user selects a swap route
   * Transition: initialized/draft/cancelled/failed → draft
   */
  addRouteData(id: string, data: AddRouteDataInput): Promise<Transaction>;

  /**
   * Submit a transaction (mark as submitted with txHash)
   * Transition: draft/initialized → submitted
   */
  submit(id: string, txHash: string): Promise<Transaction>;

  // ===========================================================================
  // Status Transition Methods (explicit, validated)
  // ===========================================================================

  /**
   * Cancel a transaction (user-initiated)
   * Transition: initialized/draft/failed → cancelled
   */
  cancel(id: string): Promise<Transaction>;

  /**
   * Mark a transaction as failed
   * Transition: draft/submitted/pending → failed
   */
  fail(id: string, errorMessage: string): Promise<Transaction>;

  /**
   * Mark transaction as pending (source chain confirmed, awaiting destination)
   * Internal use only (worker)
   * Transition: submitted → pending
   */
  markPending(id: string): Promise<Transaction>;

  /**
   * Confirm a transaction (completed successfully)
   * Internal use only (worker)
   * Transition: submitted/pending → confirmed
   */
  confirm(id: string, explorerUrl?: string): Promise<Transaction>;

  /**
   * Mark transaction as expired (route/TTL expired)
   * Internal use only (system/worker)
   * Transition: initialized/draft/submitted/pending → expired
   */
  markExpired(id: string): Promise<Transaction>;

  /**
   * Mark transaction as abandoned (user left)
   * Internal use only (system/worker)
   * Transition: initialized/draft → abandoned
   */
  markAbandoned(id: string): Promise<Transaction>;

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  /**
   * Get transaction by ID
   */
  get(id: string): Promise<Transaction | null>;

  /**
   * Find transaction by external ID within a checkout
   */
  findByExternalId(
    checkoutId: string,
    externalId: string,
  ): Promise<Transaction | null>;

  /**
   * List transactions for a checkout
   */
  list(
    checkoutId: string,
    options?: TransactionListOptions,
  ): Promise<PaginatedResponse<Transaction>>;

  /**
   * Get all pending transactions (for reconciliation)
   */
  getPending(): Promise<Transaction[]>;

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Increment retry count (for monitoring)
   */
  incrementRetry(id: string): Promise<number>;
}

// =============================================================================
// User Service
// =============================================================================

export interface UserListOptions {
  page?: number;
  pageSize?: number;
}

export interface UserService {
  /**
   * Get or create user by wallet address
   */
  getOrCreateByWallet(
    checkoutId: string,
    walletAddress: string,
    chainId?: number,
  ): Promise<User>;

  /**
   * Get user by ID
   */
  get(id: string): Promise<User | null>;

  /**
   * Find user by wallet address
   */
  findByWallet(walletAddress: string): Promise<User | null>;

  /**
   * List users for a checkout
   */
  list(
    checkoutId: string,
    options?: UserListOptions,
  ): Promise<PaginatedResponse<User>>;

  /**
   * Add wallet to user
   */
  addWallet(userId: string, wallet: UserWallet): Promise<User>;

  /**
   * Update user stats after transaction completion
   */
  updateStats(
    userId: string,
    stats: {
      transactionCount?: number;
      successfulTransactionCount?: number;
      totalVolumeUsd?: string;
    },
  ): Promise<User>;
}

// =============================================================================
// Checkout Service
// =============================================================================

export interface CheckoutListOptions {
  page?: number;
  pageSize?: number;
}

export interface CheckoutService {
  /**
   * Get checkout by ID
   */
  get(id: string): Promise<StoredCheckoutConfig | null>;

  /**
   * Get stats for a checkout
   */
  getStats(checkoutId: string): Promise<Stats>;

  /**
   * Invalidate cached stats (after transaction updates)
   */
  invalidateStats(checkoutId: string): Promise<void>;
}

// =============================================================================
// Prospect Service
// =============================================================================
//
// Phase 2-brands: first-class Prospect records (separate from the legacy
// `ProspectProfile` aggregate in `lib/actions/prospects.ts`, which is a richer
// object with auto-generated demos baked in). Both shapes coexist —
// ProspectService is the migration target for the Postgres flip.

/**
 * Border radius token. Mirrors `BorderRadiusSize` in
 * `lib/types/dashboard.ts` — kept service-local so the service module
 * stays standalone.
 */
export type ProspectBorderRadius = "xs" | "sm" | "md" | "lg";

/**
 * Logo discriminator. "dynamic" renders the default Dynamic mark;
 * "custom" renders `logoUrl`.
 */
export type ProspectLogoKind = "custom" | "dynamic";

/** Lifecycle state. Mirrors the Prisma `ProspectStatus` enum. */
export type ProspectStatus = "ACTIVE" | "ARCHIVED";

/**
 * Prospect row as it lives in Postgres (mirrors the Prisma `Prospect` model).
 * The dashboard service layer surfaces this shape regardless of backend.
 *
 * Phase 2-brand-cutover (2026-05-06): expanded to carry every field the
 * legacy `ProspectProfile` aggregate carried. The colour fields used to
 * live in a nested `ProspectTheme` object on the Redis-only aggregate;
 * they now live flat on the row in both backends.
 */
export interface Prospect {
  id: string;
  ownerId: string;
  /** Owning team; null until a prospect is explicitly assigned to one. */
  teamId: string | null;
  /** Resolved creator (FK -> User); null for legacy rows not yet reconciled. */
  createdById: string | null;
  status: ProspectStatus;
  name: string;
  description: string | null;
  companyUrl: string | null;
  logo: ProspectLogoKind;
  logoUrl: string | null;
  borderRadius: ProspectBorderRadius | null;
  primaryColor: string;
  primaryHoverColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  pageBackground: string | null;
  background: string | null;
  foreground: string | null;
  mutedTextColor: string | null;
  borderColor: string | null;
  rowBackground: string | null;
  rowHoverBackground: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
  /** Identity fields added in Phase GTM-01. Both nullable. */
  domain: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProspectInput {
  ownerId: string;
  /** Null when omitted; a prospect belongs to no team until explicitly assigned. */
  teamId?: string | null;
  createdById?: string | null;
  status?: ProspectStatus;
  name: string;
  description?: string | null;
  companyUrl?: string | null;
  /** Defaults to "dynamic" if omitted. */
  logo?: ProspectLogoKind;
  logoUrl?: string | null;
  borderRadius?: ProspectBorderRadius | null;
  primaryColor: string;
  primaryHoverColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  pageBackground?: string | null;
  background?: string | null;
  foreground?: string | null;
  mutedTextColor?: string | null;
  borderColor?: string | null;
  rowBackground?: string | null;
  rowHoverBackground?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  domain?: string | null;
  notes?: string | null;
}

export interface UpdateProspectInput {
  teamId?: string | null;
  createdById?: string | null;
  status?: ProspectStatus;
  name?: string;
  description?: string | null;
  companyUrl?: string | null;
  logo?: ProspectLogoKind;
  logoUrl?: string | null;
  borderRadius?: ProspectBorderRadius | null;
  primaryColor?: string;
  primaryHoverColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  pageBackground?: string | null;
  background?: string | null;
  foreground?: string | null;
  mutedTextColor?: string | null;
  borderColor?: string | null;
  rowBackground?: string | null;
  rowHoverBackground?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  domain?: string | null;
  notes?: string | null;
}

export interface ProspectListOptions extends PageOptions {
  /** Scope + filter where-fragment; callers build this via `prospectScopeWhere` /
   * `prospectVisibilityWhere` - the service never derives scope itself. */
  where?: Prisma.ProspectWhereInput;
}

export interface ProspectService {
  create(input: CreateProspectInput): Promise<Prospect>;
  get(id: string): Promise<Prospect | null>;
  list(options?: ProspectListOptions): Promise<Page<Prospect>>;
  update(id: string, input: UpdateProspectInput): Promise<Prospect>;
  delete(id: string): Promise<void>;
  /**
   * Idempotent create-or-update by caller-supplied id. If the row exists,
   * all fields are overwritten with the new input and `updatedAt` bumps.
   * `createdAt` is preserved on update.
   */
  upsertWithId(id: string, input: CreateProspectInput): Promise<Prospect>;
  /**
   * Id-only projection for a where fragment - unpaginated, returns every
   * matching id (not a page). Used by `visibleProspectIds`, which needs the
   * full bounded (own + team) visible set, never just one page of it.
   */
  listIds(where: Prisma.ProspectWhereInput): Promise<string[]>;
}

// =============================================================================
// Transaction Record Service (Phase 2-transactions — canonical state machine)
// =============================================================================
//
// Distinct from `TransactionService` above, which is the LI.FI-checkout-bound
// transaction stored in Redis. `TransactionRecordService` carries the
// canonical "money in flight" record from `@dynamic-demos/transactions`
// (D-010); state transitions are validated by `assertValidTransition` at the
// service boundary before every write.
//
// The two services coexist intentionally — Phase 5A's webhook framework
// writes here only; existing demos keep using the legacy shape until they
// migrate one-by-one.

/**
 * Cross-package references attached to a TransactionRecord. Mirrors
 * `TransactionRefs` from `@dynamic-demos/transactions` so the service
 * layer is the only translator between in-memory and on-disk shapes.
 */
export interface TransactionRecordRefs {
  /** ID of the demo instance (config) that initiated the transaction. */
  demoInstanceId?: string | null;
  /** ID of the prospect profile linked to the demo instance. */
  prospectId?: string | null;
  /** ID of the parent transaction in a multi-leg flow. */
  parentTransactionId?: string | null;
}

/**
 * Canonical TransactionRecord row as it lives in Postgres (mirrors the
 * Prisma `Transaction` model). The dashboard service layer surfaces this
 * shape regardless of backend so parity tests can run cross-impl.
 *
 * `payload` and `refs` are intentionally `unknown` here — kind-specific
 * narrowing happens in the consumer (e.g. webhook normaliser, Phase 5A).
 */
export interface TransactionRecord {
  id: string;
  kind: string;
  state: TransactionState;
  demoInstanceId: string | null;
  prospectId: string | null;
  parentTransactionId: string | null;
  payload: unknown;
  refs: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionRecordInput {
  kind: string;
  /** Optional initial state. Defaults to `"initialized"` if omitted. */
  state?: TransactionState;
  demoInstanceId?: string | null;
  prospectId?: string | null;
  parentTransactionId?: string | null;
  payload?: unknown;
  refs?: unknown;
}

/**
 * Update only the state of a TransactionRecord. The service must validate
 * `from → to` via `assertValidTransition` before writing — never widen
 * acceptable states at the service boundary.
 */
export interface UpdateTransactionStateInput {
  state: TransactionState;
}

/**
 * Update mutable non-state fields. State changes go through
 * `updateState`; this method exists for late-arriving payload data
 * (e.g. provider txHash) and must NOT touch `state`.
 */
export interface UpdateTransactionPayloadInput {
  payload?: unknown;
  refs?: unknown;
  demoInstanceId?: string | null;
  prospectId?: string | null;
}

export interface TransactionRecordListOptions {
  demoInstanceId?: string;
  prospectId?: string;
  state?: TransactionState | TransactionState[];
  kind?: string;
  parentTransactionId?: string;
}

export interface TransactionRecordService {
  create(input: CreateTransactionRecordInput): Promise<TransactionRecord>;
  get(id: string): Promise<TransactionRecord | null>;
  list(options?: TransactionRecordListOptions): Promise<TransactionRecord[]>;
  /**
   * Validate `from → to` via `assertValidTransition`, then persist.
   * Throws `IllegalTransitionError` (re-exported by the state machine) if
   * the transition is illegal. The terminal state check lives in the
   * state machine itself — service callers never branch on terminality.
   */
  updateState(
    id: string,
    input: UpdateTransactionStateInput,
  ): Promise<TransactionRecord>;
  updatePayload(
    id: string,
    input: UpdateTransactionPayloadInput,
  ): Promise<TransactionRecord>;
  delete(id: string): Promise<void>;
}

// =============================================================================
// Webhook Event Service (Phase 2-transactions)
// =============================================================================
//
// Persists every received webhook before processing (D-011). Phase 5A's
// receivers consume this. Postgres-only by design — Redis never had a
// webhook event table and we want the audit trail durable from day one.

/**
 * Webhook event row as it lives in Postgres (mirrors the Prisma
 * `WebhookEvent` model). `processingStatus` is a string enum maintained
 * at the service layer; "pending" | "processed" | "failed" | "ignored".
 */
export type WebhookProcessingStatus =
  | "pending"
  | "processed"
  | "failed"
  | "ignored";

export interface WebhookEventRecord {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  receivedAt: Date;
  signatureValid: boolean;
  rawPayload: unknown;
  normalizedPayload: unknown;
  transactionId: string | null;
  demoInstanceId: string | null;
  prospectId: string | null;
  processingStatus: WebhookProcessingStatus;
  processingError: string | null;
  processedAt: Date | null;
}

export interface CreateWebhookEventInput {
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  signatureValid: boolean;
  rawPayload: unknown;
  normalizedPayload: unknown;
  transactionId?: string | null;
  demoInstanceId?: string | null;
  prospectId?: string | null;
  /** Defaults to "pending" if omitted. */
  processingStatus?: WebhookProcessingStatus;
}

export interface MarkWebhookEventProcessedInput {
  processingStatus: WebhookProcessingStatus;
  processingError?: string | null;
  /** When omitted, defaults to "now" at the service layer. */
  processedAt?: Date;
}

export interface WebhookEventListOptions {
  provider?: string;
  transactionId?: string;
  processingStatus?: WebhookProcessingStatus;
  /** ISO range filter on `receivedAt`. Inclusive. */
  receivedAfter?: Date;
  receivedBefore?: Date;
}

export class DuplicateWebhookEventError extends Error {
  constructor(
    public readonly provider: string,
    public readonly providerEventId: string,
  ) {
    super(
      `Duplicate webhook event: provider=${provider} providerEventId=${providerEventId}`,
    );
    this.name = "DuplicateWebhookEventError";
  }
}

export interface WebhookEventService {
  /**
   * Insert a new webhook event. Throws `DuplicateWebhookEventError` if a
   * row already exists with the same `(provider, providerEventId)` —
   * callers can catch and treat as idempotent success.
   */
  create(input: CreateWebhookEventInput): Promise<WebhookEventRecord>;
  get(id: string): Promise<WebhookEventRecord | null>;
  /** Look up by the provider's dedup key. */
  findByProviderEvent(
    provider: string,
    providerEventId: string,
  ): Promise<WebhookEventRecord | null>;
  list(options?: WebhookEventListOptions): Promise<WebhookEventRecord[]>;
  markProcessed(
    id: string,
    input: MarkWebhookEventProcessedInput,
  ): Promise<WebhookEventRecord>;
}

// =============================================================================
// Demo Config Service (Phase 2 — unified DemoConfig table)
// =============================================================================
//
// Single per-demo-type config row carrier (mirrors the Prisma `DemoConfig`
// model). One table for every demo type — earn, wallet, trade, visa-direct,
// checkout, remittance — discriminated by `kind`. Replaces what would
// otherwise be one Postgres table per demo type. Adding a new demo type
// is a Zod-schema change, not a migration.
//
// `kind` is a string (not a Prisma enum). The strict per-kind payload
// schemas land alongside the action-layer wiring follow-up; for now the
// per-kind config payload is permissive (`z.record(z.unknown())`).

/**
 * Closed set of demo kinds supported by the unified `DemoConfig` table.
 * Lives at the service layer (not in the Prisma schema) so adding a new
 * demo type doesn't require a migration. Validation enforced via
 * `demoConfigKindSchema` (see ./demo-config-schemas.ts).
 */
export type DemoConfigKind =
  | "earn"
  | "wallet"
  | "trade"
  | "visa-direct"
  | "checkout"
  | "remittance"
  | "flow"
  | "card"
  | "connections"
  | "accounts";

/**
 * Demo config row as it lives in Postgres (mirrors the Prisma `DemoConfig`
 * model). The dashboard service layer surfaces this shape regardless of
 * backend. `themeOverrides` is optional per D-028 - `Prospect` is the source
 * of truth for visual theme; demos may carry per-config overrides.
 */
export interface DemoConfigRecord {
  id: string;
  kind: DemoConfigKind;
  ownerId: string;
  /** Resolved creator (FK -> User); null for legacy rows not yet reconciled. */
  createdById: string | null;
  name: string | null;
  description: string | null;
  /// Null means "built for" nobody yet - a reusable/showcase demo, not bound
  /// to a Prospect. Set explicitly by the caller; never hash-derived.
  prospectId: string | null;
  /**
   * Marks the canonical config for its (prospectId, kind) pair. Resolution
   * (`resolveProspectDemos`) picks the isPrimary row first, else the most
   * recently updated row for that kind.
   */
  isPrimary: boolean;
  /**
   * Optional per-config theme overrides merged on top of the linked
   * Prospect's theme at the service boundary. Null means "render prospect
   * theme as-is" (D-028).
   */
  themeOverrides: unknown | null;
  /**
   * Kind-specific payload. The Zod discriminated union narrows on
   * `kind` at the service write boundary; consumers can re-narrow.
   * Kept permissive for this PR - strict per-kind schemas land
   * alongside the action-layer wiring follow-up.
   */
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDemoConfigInput {
  kind: DemoConfigKind;
  ownerId: string;
  createdById?: string | null;
  name?: string | null;
  description?: string | null;
  prospectId: string | null;
  /** Defaults to false when omitted. */
  isPrimary?: boolean;
  themeOverrides?: unknown | null;
  config: unknown;
}

export interface UpdateDemoConfigInput {
  createdById?: string | null;
  name?: string | null;
  description?: string | null;
  prospectId?: string | null;
  isPrimary?: boolean;
  themeOverrides?: unknown | null;
  config?: unknown;
}

export interface DemoConfigListOptions extends PageOptions {
  /** Scope + filter where-fragment; callers build this via
   * `demoConfigVisibilityWhere` / `demoConfigActiveScopeWhere` - the service
   * never derives scope itself. ANDed with `kind` / `prospectId` below - never
   * clobbered by them, even when `where` itself carries a nested OR/AND. */
  where?: Prisma.DemoConfigWhereInput;
  /** When set, restrict results to configs of this kind. */
  kind?: DemoConfigKind;
  /** When set, restrict results to configs that reference this Prospect. */
  prospectId?: string;
}

export interface DemoConfigService {
  create(input: CreateDemoConfigInput): Promise<DemoConfigRecord>;
  get(id: string): Promise<DemoConfigRecord | null>;
  list(options?: DemoConfigListOptions): Promise<Page<DemoConfigRecord>>;
  update(
    id: string,
    input: UpdateDemoConfigInput,
  ): Promise<DemoConfigRecord>;
  delete(id: string): Promise<void>;
  /**
   * Idempotent create-or-update by caller-supplied id. Preserves the
   * caller's id so existing demo URLs that embed it keep working
   * unchanged (Q-014). Preserves `createdAt` on update; bumps `updatedAt`.
   */
  upsertWithId(
    id: string,
    input: CreateDemoConfigInput,
  ): Promise<DemoConfigRecord>;
  /**
   * Unpaginated projection for a where fragment - every matching row,
   * never just one page. Used by callers that need the complete scoped
   * kind-lookup (analytics `kindByConfigId`, per-kind demo-config id
   * resolution for `demoKindSummary`/`demoKindTimeseries`/
   * `demoKindFunnel`) as well as batch prospect-demo resolution
   * (`resolveProspectDemosBatch`, which needs `prospectId`/`isPrimary`/
   * `updatedAt` to pick the primary-or-latest config per kind without an
   * N+1 query per prospect), never a full-record full-table list.
   */
  listIdKinds(where: Prisma.DemoConfigWhereInput): Promise<
    {
      id: string;
      kind: DemoConfigKind;
      prospectId: string | null;
      isPrimary: boolean;
      updatedAt: Date;
    }[]
  >;
}

// =============================================================================
// GTM User Service
// =============================================================================
//
// Single internal-person entity (mirrors the Prisma `User` model).
// Postgres-only, no cutover flag - `services.users` always resolves to
// `PostgresGtmUserService`. Types stay `Gtm`-prefixed: `User` is already
// imported above for the legacy per-checkout wallet user, and `User` is
// also the Prisma model name.

/// Mirrors the Prisma `Role` enum. OWNER: everything, incl. role grants -
/// only OWNERs modify OWNERs. ADMIN: mutates any record, grants roles below
/// ADMIN, reaches the operations surface. MEMBER: sign-in default - creates
/// and mutates own records, mints share links. VIEWER: read-only.
export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface GtmUser {
  id: string;
  email: string;
  /** Dynamic JWT `sub`. Null until first verified sign-in; write-once
   * thereafter - see `DynamicUserIdConflictError`. */
  dynamicUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  schedulingUrl: string | null;
  role: UserRole;
  /** Offboarding lifecycle. Non-null rejects sign-in (Phase 04). */
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Per-table counts of legacy records claimed by `claimLegacyRecords`. */
export interface ClaimLegacyRecordsResult {
  prospects: number;
  demoConfigs: number;
}

/**
 * Fields a caller may change via `GtmUserService.update`. `schedulingUrl`
 * is validated at the service layer (zod, https-only) before it ever
 * reaches Prisma - rejects `javascript:`, `http://`, and any non-https
 * scheme. `dynamicUserId` is write-once - see `DynamicUserIdConflictError`.
 */
export interface UpdateGtmUserInput {
  displayName?: string | null;
  schedulingUrl?: string | null;
  avatarUrl?: string | null;
  dynamicUserId?: string | null;
}

export class InvalidSchedulingUrlError extends Error {
  constructor(reason: string) {
    super(`Invalid schedulingUrl: ${reason}`);
    this.name = "InvalidSchedulingUrlError";
  }
}

/**
 * Thrown by `GtmUserService.update` when `dynamicUserId` is already set to
 * a different, non-null value - the column is write-once.
 */
export class DynamicUserIdConflictError extends Error {
  constructor(
    public readonly userId: string,
    public readonly existing: string,
    public readonly attempted: string,
  ) {
    super(
      `User ${userId} already has dynamicUserId "${existing}"; refusing to overwrite with "${attempted}"`,
    );
    this.name = "DynamicUserIdConflictError";
  }
}

export interface GtmUserService {
  /**
   * Normalises `email` to lowercase before lookup/create so the same
   * person never ends up with two rows because of casing. Creates with
   * `dynamicUserId: null`; role seeding (OWNER/ADMIN allowlists) stays out
   * of this service.
   */
  getOrCreateByEmail(email: string): Promise<GtmUser>;
  get(id: string): Promise<GtmUser | null>;
  /** Cursor-paginated, newest-updated first. Used by the team + role admin UI. */
  list(options?: PageOptions): Promise<Page<GtmUser>>;
  /** Read-only lookup by email (lowercased); null when absent. Never creates. */
  findByEmail(email: string): Promise<GtmUser | null>;
  update(id: string, input: UpdateGtmUserInput): Promise<GtmUser>;
  /** Role assignment. */
  setRole(id: string, role: UserRole): Promise<GtmUser>;
  /**
   * Batch-resolves users by Dynamic JWT `sub` (`dynamicUserId`) - the join
   * key back to `Prospect.ownerId` / `DemoConfig.ownerId`. Unknown subs are
   * simply absent from the returned map.
   */
  resolveByDynamicIds(subs: string[]): Promise<Map<string, GtmUser>>;
  /**
   * One UPDATE per table setting `createdById = user.id` on Prospect +
   * DemoConfig rows whose `ownerId` equals the user's `dynamicUserId` and
   * whose `createdById` is still null. Idempotent (re-runs claim nothing);
   * no-op when `dynamicUserId` is null. Returns per-table counts.
   */
  claimLegacyRecords(
    user: Pick<GtmUser, "id" | "dynamicUserId">,
  ): Promise<ClaimLegacyRecordsResult>;
}

// =============================================================================
// Team Service
// =============================================================================
//
// Team + TeamMembership (no per-membership role; workspace Role governs).
// Postgres-only, no cutover flag. Seeded default team has slug "gtm".

export interface Team {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface TeamMembership {
  id: string;
  userId: string;
  teamId: string;
  /** Per-team role (same `Role` enum). Global OWNER/ADMIN bypass it. */
  role: UserRole;
  createdAt: Date;
}

export interface CreateTeamInput {
  name: string;
  slug: string;
}

export class TeamMembershipNotFoundError extends Error {
  constructor(
    public readonly userId: string,
    public readonly teamId: string,
  ) {
    super(`TeamMembership not found: userId=${userId} teamId=${teamId}`);
    this.name = "TeamMembershipNotFoundError";
  }
}

export interface TeamService {
  create(input: CreateTeamInput): Promise<Team>;
  /** Cursor-paginated, newest-created first. `Team` has no `updatedAt` column,
   * so ordering keys off `createdAt` (see `postgres/teams.ts`). */
  list(options?: PageOptions): Promise<Page<Team>>;
  /** Idempotent: adding an existing (userId, teamId) returns the current row
   * unchanged (role is not re-applied). Defaults new members to MEMBER. */
  addMember(
    userId: string,
    teamId: string,
    role?: UserRole,
  ): Promise<TeamMembership>;
  /** Idempotent: removing an absent membership is a no-op. */
  removeMember(userId: string, teamId: string): Promise<void>;
  /** Sets a membership's role. Throws `TeamMembershipNotFoundError` when the
   * (userId, teamId) pair has no membership. */
  setMembershipRole(
    userId: string,
    teamId: string,
    role: UserRole,
  ): Promise<TeamMembership>;
  membershipsForUser(userId: string): Promise<TeamMembership[]>;
  /** Every membership of a team, oldest first. Used by the team admin UI. */
  membershipsForTeam(teamId: string): Promise<TeamMembership[]>;
}

// =============================================================================
// Share Link Service
// =============================================================================
//
// Per-prospect, per-demo share link. Postgres-only, no cutover flag. No
// Prisma-level FK to `Prospect`/`DemoConfig` (decoupled lifetimes, like
// `Transaction.prospectId` / `WebhookEvent.prospectId`); `mint` verifies
// both exist at the service layer instead.

export type ShareLinkStatus = "active" | "revoked";

export interface ShareLink {
  id: string;
  token: string;
  demoConfigId: string;
  prospectId: string;
  userId: string;
  status: ShareLinkStatus;
  expiresAt: Date | null;
  createdAt: Date;
}

/** `resolveByToken`'s return shape. `user` comes via the Prisma relation;
 * `prospect` via a service-layer lookup since `ShareLink` has no
 * FK/relation field for it. */
export interface ShareLinkWithContext extends ShareLink {
  user: GtmUser;
  prospect: Prospect;
}

export interface MintShareLinkInput {
  demoConfigId: string;
  prospectId: string;
  userId: string;
}

export class DemoConfigNotFoundError extends Error {
  constructor(public readonly demoConfigId: string) {
    super(`DemoConfig not found: ${demoConfigId}`);
    this.name = "DemoConfigNotFoundError";
  }
}

export class ShareLinkProspectNotFoundError extends Error {
  constructor(public readonly prospectId: string) {
    super(`Prospect not found: ${prospectId}`);
    this.name = "ShareLinkProspectNotFoundError";
  }
}

export interface ShareLinkService {
  /**
   * Verifies `demoConfigId` and `prospectId` both exist (throws
   * `DemoConfigNotFoundError` / `ShareLinkProspectNotFoundError`
   * otherwise), then mints a `nanoid(21)` url-safe token and creates the
   * row with `status: "active"`.
   */
  mint(input: MintShareLinkInput): Promise<ShareLink>;
  /**
   * Returns `null` unless the link exists, `status === "active"`, and
   * (when set) `expiresAt` is in the future. Never throws - the
   * share-link path must never 404 for prospects (GTM hard rule).
   */
  resolveByToken(token: string): Promise<ShareLinkWithContext | null>;
  /** Raw lookup by id, any status. Used for ownership checks (e.g. revoke). */
  get(id: string): Promise<ShareLink | null>;
  /**
   * Raw lookup by token, any status (unlike `resolveByToken`, never filters
   * on active/expired). Lets `/s/[token]` tell "unknown token" (can't
   * identify a demo, redirect `/`) apart from "known but inactive" (demo
   * identified, degrade to its plain launch URL) - Phase 05.
   */
  findByToken(token: string): Promise<ShareLink | null>;
  /** Flips `status` to `"revoked"`. Idempotent - revoking twice is a no-op. */
  revoke(id: string): Promise<ShareLink>;
  /**
   * Bounded count of links ever minted by `userId`, any status - used by the
   * dashboard-home "Getting started" checklist to detect "has shared a demo"
   * without a full-list fetch. Not filtered to `active`: a later-revoked link
   * still counts, since the checklist tracks the one-time action of sharing,
   * not current link validity.
   */
  countByUser(userId: string): Promise<number>;
}

// =============================================================================
// Visitor Session Service
// =============================================================================
//
// `VisitorSession.id` / `TrackEvent.id` are client-generated UUIDs
// (packages/analytics mints them) - no `@default`, so every insert here
// must be idempotent-friendly. This service is write-only.

/**
 * One event as it arrives in a validated batch. Mirrors
 * `packages/analytics`'s `trackEventSchema` structurally without importing
 * it, so `packages/db`'s only consumer (D-015) stays free of the
 * cross-package dependency.
 */
export interface TrackEventInput {
  /** Client-generated UUID - becomes `TrackEvent.id`, the idempotency key. */
  eventId: string;
  type: "pageview" | "step" | "milestone" | "identify";
  /** `name === "heartbeat"` events advance `lastSeenAt` but are never persisted as a row. */
  name: string;
  path?: string;
  /** Epoch ms, client clock. */
  ts: number;
  props?: Record<string, unknown>;
}

/**
 * Session-level identity carried on a batch. Mirrors `packages/analytics`'s
 * `identitySchema` structurally (see `TrackEventInput`).
 */
export interface TrackIdentityInput {
  userId: string;
  email?: string;
  traits?: Record<string, unknown>;
}

/** Mirrors `packages/analytics`'s `trackBatchSchema` structurally (see `TrackEventInput`). */
export interface TrackBatchInput {
  sessionId: string;
  anonId: string;
  demoSlug: string;
  /** Present when the visit carries a `?share=` token. Unused by this
   * service directly - callers resolve it to `meta.shareLinkId` before
   * calling `upsertFromBatch`. */
  shareToken?: string;
  /** Client-declared hint. `meta.isInternal` (server-resolved) is
   * authoritative for persistence - this service does not read this field. */
  isInternal?: boolean;
  /** Set via `identify()`, carried on every batch from then on (SP1). When
   * present, `upsertFromBatch` persists it onto the session - last-wins,
   * but a batch without `identity` never nulls out a previously-persisted
   * value. */
  identity?: TrackIdentityInput;
  events: TrackEventInput[];
}

/**
 * Request-derived metadata the ingest route computes server-side and
 * passes alongside the batch. Never trust these values from the client
 * payload directly - geo/UA are derived from headers, `ipHash` is
 * `sha256(ip + IP_HASH_SALT)` (raw IP never persisted).
 */
export interface VisitorSessionMeta {
  geo: { country?: string; region?: string; city?: string };
  ua: { device?: string; os?: string; browser?: string };
  ipHash: string;
  shareLinkId: string | null;
  isInternal: boolean;
}

export interface UpsertVisitorSessionResult {
  /** True when the session row was newly inserted by this call - used to
   * gate one-time enrichment. */
  created: boolean;
}

export interface VisitorSessionService {
  /**
   * Upserts the `VisitorSession` row by `batch.sessionId`: creates it with
   * `meta` on first sight, or (on subsequent calls) advances `lastSeenAt`
   * forward-only to the max event `ts` in this batch - never backward,
   * and meta fields are not re-applied on update. When `batch.identity` is
   * present, persists it onto `identifiedUserId`/`identifiedEmail`/
   * `identityTraits` (create and update) - last-wins across batches, but a
   * batch without `identity` never nulls out a previously-persisted value.
   * Then inserts every non-heartbeat event via
   * `createMany({ skipDuplicates: true })` so retried batches / duplicate
   * event ids never double-write.
   */
  upsertFromBatch(
    batch: TrackBatchInput,
    meta: VisitorSessionMeta,
  ): Promise<UpsertVisitorSessionResult>;
}

// =============================================================================
// Analytics Service (read model)
// =============================================================================
//
// Read-only rollups over VisitorSession/TrackEvent. Sessions link to a
// prospect + demo config ONLY through their `shareLink` (VisitorSession has
// no direct prospectId/demoConfigId) - every read joins
// `VisitorSession -> ShareLink`. Internal self-views (`isInternal`) are
// excluded from every aggregate and list. PII boundary (Phase 10): raw IPs
// are never surfaced - only enrichment company + captured identity.

// ---- Two-tier read scope ----
//
// Tier 1 (prospect visibility): which prospects the viewer may see at all -
//   `"all"` for OWNER/ADMIN, otherwise the id set from
//   `lib/auth/gtm.visibleProspectIds`. Callers resolve this once and hand it
//   to the read layer; the layer NEVER widens it (a caller cannot read a
//   prospect it was not scoped to). Enforce with `isProspectInReadScope`.
// Tier 2 (demo-config visibility): own-vs-prospect-derived, resolved by the
//   caller via `lib/auth/gtm.isDemoConfigVisible` before passing a
//   `demoConfigId` filter. The read layer trusts an in-scope demoConfigId.
export type AnalyticsReadScope = "all" | ReadonlySet<string>;

/** Tier-1 gate: is this prospect inside the caller's resolved read scope. */
export function isProspectInReadScope(
  scope: AnalyticsReadScope,
  prospectId: string,
): boolean {
  return scope === "all" || scope.has(prospectId);
}

/** Enrichment projected to the PII-safe surface (never any raw IP). */
export interface ContactCompany {
  name: string | null;
  domain: string | null;
}

/** One session row, read-only and PII-bounded (company + captured identity). */
export interface VisitorSessionView {
  id: string;
  /** Resolved via the session's share link; null for unattributed sessions. */
  demoConfigId: string | null;
  /** Demo kind slug the session ran under (e.g. "wallet"). */
  demoSlug: string;
  anonId: string;
  startedAt: string;
  lastSeenAt: string;
  /** From `enrichment` (Phase 10), read defensively; null when absent. */
  company: ContactCompany | null;
  /** Captured identity from the wallet-pilot `authenticated` milestone. */
  email: string | null;
  dynamicUserId: string | null;
  /** Milestone event names seen in the session, first-seen order. */
  milestones: string[];
  /**
   * Session-level identity persisted server-side via `identify()` (SP2) -
   * additive alongside `email`/`dynamicUserId` above. A later sub-project
   * (SP4, lead capture) can read these instead of parsing the `authenticated`
   * milestone.
   */
  identifiedUserId: string | null;
  identifiedEmail: string | null;
}

/** A viewer rolled up across their sessions on one prospect ("who viewed"). */
export interface ContactView {
  /** Stable identity key: captured email when present, else `anonId`. */
  key: string;
  email: string | null;
  company: ContactCompany | null;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  /** Distinct demo kinds this viewer touched, alphabetical. */
  demoSlugs: string[];
}

/**
 * A viewer rolled up across every prospect in the caller's scope (the
 * org-wide Contacts workspace view) - the cross-prospect sibling of
 * `ContactView`. `id` mirrors `key`; it exists only so this shape satisfies
 * the cursor-pagination `toPage` contract (`{id: string}`), the same reason
 * every other paginated record carries an `id`.
 */
export interface OrgContactView extends ContactView {
  id: string;
  /** Distinct prospect ids this contact touched within scope, sorted. */
  prospectIds: string[];
}

/** Per-demo engagement rollup surfaced on the Demos table + hub demo cards. */
export interface DemoSummary {
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  /** ISO of the most recent `lastSeenAt`; null when never viewed. */
  lastViewedAt: string | null;
}

/** Per-prospect engagement rollup surfaced on the overview + prospect hub. */
export interface ProspectSummary {
  sessions: number;
  viewers: number;
  avgDurationSec: number;
  lastViewedAt: string | null;
}

/**
 * Org-wide engagement totals for the overview stat cards, over an explicit
 * set of prospect ids (the caller resolves scope -> ids). `sessions` and
 * `viewers` are true distinct totals across the set (a viewer seen on two
 * prospects counts once, unlike summing per-prospect `ProspectSummary`);
 * `activeThisWeek` is the count of those prospects with a session in the
 * last 7 days.
 */
export interface OverviewEngagement {
  sessions: number;
  viewers: number;
  activeThisWeek: number;
}

/** Window for the demo-kind time-series chart; "all" means no lower bound. */
export type AnalyticsTimeRange = "7d" | "30d" | "90d" | "all";

/**
 * One UTC-day bucket of the demo-kind sessions-over-time chart. Counts only -
 * same Tier-1 guarantee as `DemoSummary`, no per-prospect identity.
 */
export interface DemoKindTimeseriesPoint {
  /** UTC day, "YYYY-MM-DD". */
  date: string;
  sessions: number;
  viewers: number;
}

/**
 * One stage of the engagement funnel. Stages are returned as an ordered
 * array so callers render whatever stages carry meaning today; `count` is a
 * session count (a session counts toward a stage if it reached it), naturally
 * non-increasing down the array. Never force monotonicity.
 */
export interface FunnelStage {
  /** Stable machine key: "viewed" | "interacted" | "authenticated" | "completed". */
  key: string;
  label: string;
  count: number;
}

/**
 * One row of the org-wide per-kind comparison. Counts only - no per-prospect
 * identity. Spans every demo of the kind visible in the actor's scope.
 */
export interface OrgDemoKindBreakdownRow {
  kind: DemoConfigKind;
  sessions: number;
  viewers: number;
}

/**
 * Read model for the demo-catalog landing funnel: visits to the catalog
 * itself, its unique visitors, and which demos those visitors go on to
 * launch. Entirely separate from prospect/share-link analytics - catalog
 * sessions carry no share link.
 */
export interface CatalogFunnel {
  /** Non-internal catalog sessions. */
  visits: number;
  /** Distinct anonId across those sessions. */
  uniqueVisitors: number;
  /** One row per launched demo, sorted by launches desc. */
  byDemo: Array<{
    slug: string;
    launches: number;
    /** launches / uniqueVisitors; 0 when uniqueVisitors is 0. */
    launchRate: number;
  }>;
}

/**
 * One UTC-day bucket of a single catalog demo's launch trend. Counts only -
 * anonymous catalog traffic, no per-person identity (there is none to reveal).
 */
export interface CatalogDemoTimeseriesPoint {
  /** UTC day, "YYYY-MM-DD". */
  date: string;
  launches: number;
}

export interface AnalyticsService {
  /** Aggregate for one demo config (caller pre-authorizes the id). */
  demoSummary(demoConfigId: string): Promise<DemoSummary>;
  /**
   * Tier-1 aggregate across every demo config of one kind. Counts only -
   * sessions, unique viewers, avg duration, last viewed - never any
   * per-prospect identity, so it is safe to show every operator. The caller
   * resolves the kind's config ids (ShareLink carries no DemoConfig relation,
   * so kind cannot be joined in-layer) and passes them in. `scope` narrows the
   * aggregate to a set of prospect ids (the My/Team filter) or spans all
   * prospects when `"all"`; narrowing never widens what the caller passed.
   */
  demoKindSummary(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
  ): Promise<DemoSummary>;
  /**
   * Tier-1 time series across every demo config of one kind, bucketed by
   * UTC day. Same counts-only guarantee as `demoKindSummary` - `scope`
   * narrows by prospect (My/Team filter), `range` narrows the window
   * ("all" = no lower bound); neither ever reveals which prospect a session
   * belongs to. `now` is injectable for deterministic tests, defaulting to
   * the real clock.
   */
  demoKindTimeseries(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]>;
  /**
   * Tier-1 engagement funnel across every demo config of one kind (the demo
   * detail "demo-fit"): Viewed -> Interacted -> Authenticated (+ Completed
   * only when a "completed" milestone exists). Same real-signal derivation
   * and counts-only guarantee as `prospectFunnel`; `scope` narrows by prospect
   * (My/Team filter), `range` narrows the window ("all" = no lower bound).
   * Never reveals which prospect a session belongs to. `range` defaults to
   * "all".
   */
  demoKindFunnel(
    demoConfigIds: readonly string[],
    scope: AnalyticsReadScope,
    range?: AnalyticsTimeRange,
    now?: Date,
  ): Promise<FunnelStage[]>;
  /** Aggregate for one prospect (caller pre-authorizes the id). */
  prospectSummary(prospectId: string): Promise<ProspectSummary>;
  /**
   * Batch of `prospectSummary` for the overview/My Prospects table - one
   * query instead of N. Returns a map keyed by prospectId; ids with no
   * sessions map to a zeroed summary.
   */
  prospectSummaries(prospectIds: string[]): Promise<Map<string, ProspectSummary>>;
  /**
   * Org-wide engagement totals for the overview stat cards across `prospectIds`
   * (the caller resolves the My/Team/All scope to ids). One lean read: no
   * `events` hydration, distinct sessions/viewers, and the count of those
   * prospects active in the last 7 days. `now` is injectable for tests.
   */
  overviewEngagement(
    prospectIds: string[],
    now?: Date,
  ): Promise<OverviewEngagement>;
  /**
   * The "who has viewed" contacts list for a prospect, grouped by viewer.
   * Tier-1 scoped: returns `[]` when `prospectId` is outside `scope`.
   */
  listProspectContacts(
    prospectId: string,
    scope: AnalyticsReadScope,
  ): Promise<ContactView[]>;
  /**
   * Raw (ungrouped) session rows for a prospect, newest first. Tier-1
   * scoped. `opts.demoConfigId` narrows to a single demo (Tier-2: caller
   * pre-authorizes the id). Returns `[]` when out of scope.
   */
  listProspectSessions(
    prospectId: string,
    scope: AnalyticsReadScope,
    opts?: { demoConfigId?: string },
  ): Promise<VisitorSessionView[]>;
  /**
   * Sessions for one contact (a `ContactView.key`) on a prospect, newest
   * first. Tier-1 scoped like `listProspectSessions`; the prospect is
   * already in-view by the time a caller has a contact key, so this is
   * defense-in-depth. Returns `[]` when out of scope or the key has no
   * sessions.
   */
  listContactSessions(
    prospectId: string,
    contactKey: string,
    scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]>;
  /**
   * Org-wide "who has viewed anything" contacts list across every prospect
   * in `scope` (the workspace Contacts view) - same identity grouping as
   * `listProspectContacts`, spanning every in-scope prospect instead of one.
   * `scope` here is the caller's resolved ACTIVE My/Team/All scope (see
   * `lib/auth/gtm.resolveAnalyticsReadScope`), never the broad
   * `visibleProspectIds` Tier-1 set. Cursor-paginated (`Page<T>` contract),
   * ordered newest-`lastSeenAt` first, ties broken by `id` for stability.
   */
  listAllContacts(
    scope: AnalyticsReadScope,
    page?: PageOptions,
  ): Promise<Page<OrgContactView>>;
  /**
   * Sessions for one contact (an `OrgContactView.key`) across every prospect
   * in `scope` - the org-wide analog of `listContactSessions`, backing the
   * Contacts workspace view's inline expand. A contact's sessions may span
   * more than one prospect here, unlike the single-prospect method.
   */
  listAllContactSessions(
    contactKey: string,
    scope: AnalyticsReadScope,
  ): Promise<VisitorSessionView[]>;
  /**
   * Daily sessions/viewers series for one prospect (the prospect Overview
   * "momentum" hero), bucketed by UTC day. Tier-1 scoped: returns `[]` when
   * `prospectId` is outside `scope`. Bounded ranges fill every day (incl.
   * zero-activity days) so the x-axis is continuous, exactly like
   * `demoKindTimeseries`. `now` is injectable for deterministic tests.
   */
  prospectTimeseries(
    prospectId: string,
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]>;
  /**
   * Engagement funnel for one prospect as an ordered stage array:
   * Viewed -> Interacted -> Authenticated (+ Completed only when a
   * "completed" milestone actually exists in the data). Derived from real
   * signals, never fabricated - stages with no meaning are omitted, not
   * emitted as always-zero. Tier-1 scoped: `[]` when out of scope. `range`
   * defaults to "all".
   */
  prospectFunnel(
    prospectId: string,
    scope: AnalyticsReadScope,
    range?: AnalyticsTimeRange,
    now?: Date,
  ): Promise<FunnelStage[]>;
  /**
   * Org/team roll-up of the daily sessions/viewers series across every demo
   * (all kinds), bucketed by UTC day. Counts only - `scope` narrows to the
   * prospects the actor owns/team ("all" for admins); never reveals which
   * prospect a session belongs to. Fills bounded ranges like
   * `demoKindTimeseries`.
   */
  orgTimeseries(
    scope: AnalyticsReadScope,
    range: AnalyticsTimeRange,
    now?: Date,
  ): Promise<DemoKindTimeseriesPoint[]>;
  /**
   * Org/team engagement funnel across every demo (all kinds). Same stage
   * shape and real-signal derivation as `prospectFunnel`; counts only,
   * `scope`-narrowed. `range` defaults to "all".
   */
  orgFunnel(
    scope: AnalyticsReadScope,
    range?: AnalyticsTimeRange,
    now?: Date,
  ): Promise<FunnelStage[]>;
  /**
   * Org/team per-kind comparison: sessions + unique viewers grouped by demo
   * kind across every demo in scope. Counts only, no per-prospect identity.
   * `kindByConfigId` maps each demo-config id to its kind - the caller
   * resolves it (ShareLink carries no DemoConfig relation, so kind cannot be
   * joined in-layer, mirroring `demoKindSummary`). Every kind present in the
   * map appears (zero-filled when it had no in-scope sessions); sessions whose
   * config id is absent from the map are dropped. `range` defaults to "all".
   */
  orgDemoKindBreakdown(
    kindByConfigId: ReadonlyMap<string, DemoConfigKind>,
    scope: AnalyticsReadScope,
    range?: AnalyticsTimeRange,
    now?: Date,
  ): Promise<OrgDemoKindBreakdownRow[]>;
  /**
   * Demo-catalog landing funnel: visits + unique visitors to the catalog
   * itself, plus which demos those visitors go on to launch. Entirely
   * separate from prospect/share-link analytics - never touches the
   * `shareLinkId not null` join the rest of this interface reads through.
   */
  catalogFunnel(): Promise<CatalogFunnel>;
  /**
   * Daily launch trend for a single catalog demo (the drill-down behind a
   * `catalogFunnel().byDemo` row): counts of that demo's `demo_launch` events
   * bucketed by UTC day, zero-filled across bounded ranges like
   * `demoKindTimeseries`. Same catalog isolation + non-internal guarantee as
   * `catalogFunnel`; `now` is injectable for deterministic tests.
   */
  catalogDemoTimeseries(
    slug: string,
    range: AnalyticsTimeRange,
    now?: Date,
  ): Promise<CatalogDemoTimeseriesPoint[]>;
}

// =============================================================================
// Contact Service (New-Lead Slack Notifier)
// =============================================================================
//
// Durable, cross-demo contact capture - distinct from the read-only
// `ContactView`/`OrgContactView` analytics rollups above (those derive from
// VisitorSession/TrackEvent; this is the durable `Contact`/`ContactAppearance`
// write path Prisma models added in Task 1). Postgres-only, no cutover flag.

export interface RecordSightingInput {
  /** Caller passes a normalized, validated email. */
  email: string;
  dynamicUserId?: string | null;
  demoSlug: string;
  prospectId?: string | null;
}

export interface RecordSightingResult {
  contact: Contact;
  /** True only for the caller that flips `notifiedAt` null -> now. */
  shouldNotify: boolean;
  appearance: ContactAppearance;
}

export interface ContactService {
  recordSighting(input: RecordSightingInput): Promise<RecordSightingResult>;
}

// =============================================================================
// Service Factory
// =============================================================================

export interface Services {
  transactions: TransactionService;
  transactionRecords: TransactionRecordService;
  webhookEvents: WebhookEventService;
  /// Legacy per-checkout wallet-user Redis service (address, chainIds, tx
  /// stats) - see `redis/users.ts`.
  legacyWalletUsers: UserService;
  checkouts: CheckoutService;
  prospects: ProspectService;
  demoConfigs: DemoConfigService;
  /// GTM SE/operator identity record.
  users: GtmUserService;
  teams: TeamService;
  shareLinks: ShareLinkService;
  visitorSessions: VisitorSessionService;
  analytics: AnalyticsService;
  contacts: ContactService;
}
