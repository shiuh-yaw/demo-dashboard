/**
 * Service Layer
 *
 * Exports service instances for use throughout the application.
 *
 * Most services still resolve to their Redis implementations. Cutover
 * flags flip record types onto Postgres one at a time:
 *   - USE_POSTGRES_PROSPECTS         → ProspectService
 *   - USE_POSTGRES_TRANSACTIONS   → TransactionRecordService
 *   - USE_POSTGRES_DEMO_CONFIGS   → DemoConfigService (unified table —
 *                                  every demo kind, including remittance)
 * Default is Redis so production stays unchanged until each explicit
 * cutover.
 *
 * `WebhookEventService` is Postgres-only by design (D-011): the audit
 * trail must be durable from day one and Redis never had this store.
 * Phase 5A's webhook receiver framework therefore requires `DATABASE_URL`
 * populated even when the rest of the dashboard is on Redis.
 */

import { env } from "@/env";
import { RedisTransactionService } from "./redis/transactions";
import { RedisUserService } from "./redis/users";
import { RedisCheckoutService } from "./redis/checkouts";
import { RedisProspectService } from "./redis/prospects";
import { RedisTransactionRecordService } from "./redis/transactions-record";
import { RedisDemoConfigService } from "./redis/demo-configs";
import { PostgresProspectService } from "./postgres/prospects";
import { PostgresTransactionRecordService } from "./postgres/transactions";
import { PostgresWebhookEventService } from "./postgres/webhook-events";
import { PostgresDemoConfigService } from "./postgres/demo-configs";
import { PostgresGtmUserService } from "./postgres/users";
import { PostgresTeamService } from "./postgres/teams";
import { PostgresShareLinkService } from "./postgres/share-links";
import { PostgresVisitorSessionService } from "./postgres/visitor-sessions";
import type {
  ProspectService,
  DemoConfigService,
  Services,
  TransactionRecordService,
  WebhookEventService,
  GtmUserService,
  TeamService,
  ShareLinkService,
  VisitorSessionService,
} from "./types";

// Export service instances
export const transactionService = new RedisTransactionService();
export const userService = new RedisUserService();
export const checkoutService = new RedisCheckoutService();
export const prospectService: ProspectService = env.USE_POSTGRES_PROSPECTS
  ? new PostgresProspectService()
  : new RedisProspectService();
export const transactionRecordService: TransactionRecordService =
  env.USE_POSTGRES_TRANSACTIONS
    ? new PostgresTransactionRecordService()
    : new RedisTransactionRecordService();
export const webhookEventService: WebhookEventService =
  new PostgresWebhookEventService();
export const demoConfigService: DemoConfigService = env.USE_POSTGRES_DEMO_CONFIGS
  ? new PostgresDemoConfigService()
  : new RedisDemoConfigService();
// Postgres-only, no cutover flag - no legacy Redis equivalent for any of
// these three (same rationale as WebhookEventService above).
export const gtmUserService: GtmUserService = new PostgresGtmUserService();
export const teamService: TeamService = new PostgresTeamService();
export const shareLinkService: ShareLinkService = new PostgresShareLinkService();
export const visitorSessionService: VisitorSessionService =
  new PostgresVisitorSessionService();

// Export as combined services object
export const services: Services = {
  transactions: transactionService,
  transactionRecords: transactionRecordService,
  webhookEvents: webhookEventService,
  legacyWalletUsers: userService,
  checkouts: checkoutService,
  prospects: prospectService,
  demoConfigs: demoConfigService,
  users: gtmUserService,
  teams: teamService,
  shareLinks: shareLinkService,
  visitorSessions: visitorSessionService,
};

// Re-export types
export type {
  TransactionService,
  UserService,
  CheckoutService,
  TransactionListOptions,
  UserListOptions,
  ProspectService,
  ProspectListOptions,
  Prospect,
  ProspectLogoKind,
  ProspectBorderRadius,
  CreateProspectInput,
  UpdateProspectInput,
  TransactionRecordService,
  TransactionRecord,
  TransactionRecordListOptions,
  CreateTransactionRecordInput,
  UpdateTransactionStateInput,
  UpdateTransactionPayloadInput,
  WebhookEventService,
  WebhookEventRecord,
  WebhookEventListOptions,
  CreateWebhookEventInput,
  MarkWebhookEventProcessedInput,
  WebhookProcessingStatus,
  DemoConfigService,
  DemoConfigRecord,
  DemoConfigListOptions,
  DemoConfigKind,
  CreateDemoConfigInput,
  UpdateDemoConfigInput,
  Services,
  GtmUserService,
  GtmUser,
  GtmUserRole,
  UpdateGtmUserInput,
  ClaimLegacyRecordsResult,
  TeamService,
  Team,
  TeamMembership,
  CreateTeamInput,
  ShareLinkService,
  ShareLink,
  ShareLinkStatus,
  ShareLinkWithContext,
  MintShareLinkInput,
  VisitorSessionService,
  TrackEventInput,
  TrackBatchInput,
  VisitorSessionMeta,
  UpsertVisitorSessionResult,
} from "./types";
export {
  DuplicateWebhookEventError,
  InvalidSchedulingUrlError,
  DynamicUserIdConflictError,
  DemoConfigNotFoundError,
  ShareLinkProspectNotFoundError,
} from "./types";
