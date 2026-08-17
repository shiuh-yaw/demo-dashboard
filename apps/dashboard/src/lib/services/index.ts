/**
 * Service Layer
 *
 * Exports service instances for use throughout the application.
 *
 * Prospect, DemoConfig, and TransactionRecord records are Postgres-only
 * (`@dynamic-demos/db`); the legacy Redis implementations and their
 * cutover flags were removed. `WebhookEventService` and the GTM stores
 * (users, teams, share links, visitor sessions, analytics) are likewise
 * Postgres-only. A populated `DATABASE_URL` is therefore required.
 *
 * `RedisTransactionService`, `RedisUserService`, and `RedisCheckoutService`
 * remain Redis-backed: they carry transient/legacy state with no Postgres
 * equivalent.
 */

import { RedisTransactionService } from "./redis/transactions";
import { RedisUserService } from "./redis/users";
import { RedisCheckoutService } from "./redis/checkouts";
import { PostgresProspectService } from "./postgres/prospects";
import { PostgresTransactionRecordService } from "./postgres/transactions";
import { PostgresWebhookEventService } from "./postgres/webhook-events";
import { PostgresDemoConfigService } from "./postgres/demo-configs";
import { PostgresGtmUserService } from "./postgres/users";
import { PostgresTeamService } from "./postgres/teams";
import { PostgresShareLinkService } from "./postgres/share-links";
import { PostgresVisitorSessionService } from "./postgres/visitor-sessions";
import { PostgresAnalyticsService } from "./postgres/analytics";
import { PostgresContactService } from "./postgres/contacts";
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
  AnalyticsService,
  ContactService,
} from "./types";

// Export service instances
export const transactionService = new RedisTransactionService();
export const userService = new RedisUserService();
export const checkoutService = new RedisCheckoutService();
export const prospectService: ProspectService = new PostgresProspectService();
export const transactionRecordService: TransactionRecordService =
  new PostgresTransactionRecordService();
export const webhookEventService: WebhookEventService =
  new PostgresWebhookEventService();
export const demoConfigService: DemoConfigService =
  new PostgresDemoConfigService();
// Postgres-only, no cutover flag - no legacy Redis equivalent for any of
// these three (same rationale as WebhookEventService above).
export const gtmUserService: GtmUserService = new PostgresGtmUserService();
export const teamService: TeamService = new PostgresTeamService();
export const shareLinkService: ShareLinkService = new PostgresShareLinkService();
export const visitorSessionService: VisitorSessionService =
  new PostgresVisitorSessionService();
// Postgres-only read model over VisitorSession/TrackEvent (no cutover flag -
// same rationale as the other Postgres-only stores). `StubAnalyticsService`
// (./analytics) stays as a zeroed fallback behind the same interface.
export const analyticsService: AnalyticsService = new PostgresAnalyticsService();
// Postgres-only, no cutover flag (New-Lead Slack Notifier) - `StubContactService`
// (./contacts) exists only to satisfy the interface in non-DB contexts and is
// never selected.
export const contactService: ContactService = new PostgresContactService();

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
  analytics: analyticsService,
  contacts: contactService,
};

// Re-export types
export type {
  Page,
  PageOptions,
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
  UserRole,
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
  AnalyticsService,
  AnalyticsReadScope,
  DemoSummary,
  ProspectSummary,
  ContactView,
  OrgContactView,
  ContactCompany,
  ContactDetail,
  ContactDemoSummary,
  VisitorSessionView,
  ContactService,
  RecordSightingInput,
  RecordSightingResult,
} from "./types";
export { isProspectInReadScope } from "./types";
export {
  DuplicateWebhookEventError,
  InvalidSchedulingUrlError,
  DynamicUserIdConflictError,
  DemoConfigNotFoundError,
  ShareLinkProspectNotFoundError,
  TeamMembershipNotFoundError,
} from "./types";
