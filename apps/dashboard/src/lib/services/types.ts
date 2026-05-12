/**
 * Service Layer Types
 *
 * Interface definitions for the service abstraction layer.
 * This allows swapping between Redis and Prisma implementations.
 */

import type { TransactionState } from "@dynamic-demos/transactions";

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
// Brand Service
// =============================================================================
//
// Phase 2-brands: first-class Brand records (separate from the legacy
// `BrandProfile` aggregate in `lib/actions/brands.ts`, which is a richer
// object with auto-generated demos baked in). Both shapes coexist —
// BrandService is the migration target for the Postgres flip.

/**
 * Border radius token. Mirrors `BorderRadiusSize` in
 * `lib/types/dashboard.ts` — kept service-local so the service module
 * stays standalone.
 */
export type BrandBorderRadius = "xs" | "sm" | "md" | "lg";

/**
 * Logo discriminator. "dynamic" renders the default Dynamic mark;
 * "custom" renders `logoUrl`.
 */
export type BrandLogoKind = "custom" | "dynamic";

/**
 * Brand row as it lives in Postgres (mirrors the Prisma `Brand` model).
 * The dashboard service layer surfaces this shape regardless of backend.
 *
 * Phase 2-brand-cutover (2026-05-06): expanded to carry every field the
 * legacy `BrandProfile` aggregate carried. The colour fields used to
 * live in a nested `BrandTheme` object on the Redis-only aggregate;
 * they now live flat on the row in both backends.
 */
export interface Brand {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  companyUrl: string | null;
  logo: BrandLogoKind;
  logoUrl: string | null;
  borderRadius: BrandBorderRadius | null;
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
  demoEarnId: string | null;
  demoCheckoutsId: string | null;
  demoWalletId: string | null;
  demoRemittanceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandInput {
  ownerId: string;
  name: string;
  description?: string | null;
  companyUrl?: string | null;
  /** Defaults to "dynamic" if omitted. */
  logo?: BrandLogoKind;
  logoUrl?: string | null;
  borderRadius?: BrandBorderRadius | null;
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
  demoEarnId?: string | null;
  demoCheckoutsId?: string | null;
  demoWalletId?: string | null;
  demoRemittanceId?: string | null;
}

export interface UpdateBrandInput {
  name?: string;
  description?: string | null;
  companyUrl?: string | null;
  logo?: BrandLogoKind;
  logoUrl?: string | null;
  borderRadius?: BrandBorderRadius | null;
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
  demoEarnId?: string | null;
  demoCheckoutsId?: string | null;
  demoWalletId?: string | null;
  demoRemittanceId?: string | null;
}

export interface BrandListOptions {
  /** When set, restrict results to brands owned by this user. */
  ownerId?: string;
}

export interface BrandService {
  create(input: CreateBrandInput): Promise<Brand>;
  get(id: string): Promise<Brand | null>;
  list(options?: BrandListOptions): Promise<Brand[]>;
  update(id: string, input: UpdateBrandInput): Promise<Brand>;
  delete(id: string): Promise<void>;
  /**
   * Idempotent create-or-update by caller-supplied id. Used by the
   * Phase 2-brands backfill so re-runs don't duplicate rows. The
   * caller supplies a deterministic id derived from the brand's
   * stable shape (see scripts/backfill-brands/hash.ts).
   *
   * If the row exists, all fields are overwritten with the new input
   * and `updatedAt` bumps. `createdAt` is preserved on update.
   */
  upsertWithId(id: string, input: CreateBrandInput): Promise<Brand>;
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
  /** ID of the brand profile linked to the demo instance. */
  brandId?: string | null;
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
  brandId: string | null;
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
  brandId?: string | null;
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
  brandId?: string | null;
}

export interface TransactionRecordListOptions {
  demoInstanceId?: string;
  brandId?: string;
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
  brandId: string | null;
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
  brandId?: string | null;
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
  | "remittance";

/**
 * Demo config row as it lives in Postgres (mirrors the Prisma `DemoConfig`
 * model). The dashboard service layer surfaces this shape regardless of
 * backend. `themeOverrides` is optional per D-028 — `Brand` is the source
 * of truth for visual theme; demos may carry per-config overrides.
 */
export interface DemoConfigRecord {
  id: string;
  kind: DemoConfigKind;
  ownerId: string;
  name: string | null;
  description: string | null;
  brandId: string;
  /**
   * Optional per-config theme overrides merged on top of the linked
   * Brand's theme at the service boundary. Null means "render brand
   * theme as-is" (D-028).
   */
  themeOverrides: unknown | null;
  /**
   * Kind-specific payload. The Zod discriminated union narrows on
   * `kind` at the service write boundary; consumers can re-narrow.
   * Kept permissive for this PR — strict per-kind schemas land
   * alongside the action-layer wiring follow-up.
   */
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDemoConfigInput {
  kind: DemoConfigKind;
  ownerId: string;
  name?: string | null;
  description?: string | null;
  brandId: string;
  themeOverrides?: unknown | null;
  config: unknown;
}

export interface UpdateDemoConfigInput {
  name?: string | null;
  description?: string | null;
  brandId?: string;
  themeOverrides?: unknown | null;
  config?: unknown;
}

export interface DemoConfigListOptions {
  /** When set, restrict results to configs owned by this user. */
  ownerId?: string;
  /** When set, restrict results to configs of this kind. */
  kind?: DemoConfigKind;
  /** When set, restrict results to configs that reference this Brand. */
  brandId?: string;
}

export interface DemoConfigService {
  create(input: CreateDemoConfigInput): Promise<DemoConfigRecord>;
  get(id: string): Promise<DemoConfigRecord | null>;
  list(options?: DemoConfigListOptions): Promise<DemoConfigRecord[]>;
  update(
    id: string,
    input: UpdateDemoConfigInput,
  ): Promise<DemoConfigRecord>;
  delete(id: string): Promise<void>;
  /**
   * Idempotent create-or-update by caller-supplied id. Used by the
   * backfill so re-runs don't duplicate rows and the existing demo
   * URLs (which embed the legacy id) keep working unchanged (Q-014).
   * Preserves `createdAt` on update; bumps `updatedAt`.
   */
  upsertWithId(
    id: string,
    input: CreateDemoConfigInput,
  ): Promise<DemoConfigRecord>;
}

// =============================================================================
// Service Factory
// =============================================================================

export interface Services {
  transactions: TransactionService;
  transactionRecords: TransactionRecordService;
  webhookEvents: WebhookEventService;
  users: UserService;
  checkouts: CheckoutService;
  brands: BrandService;
  demoConfigs: DemoConfigService;
}
