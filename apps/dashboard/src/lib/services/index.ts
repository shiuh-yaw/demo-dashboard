/**
 * Service Layer
 *
 * Exports service instances for use throughout the application.
 *
 * Most services still resolve to their Redis implementations. Cutover
 * flags flip record types onto Postgres one at a time:
 *   - USE_POSTGRES_BRANDS         → BrandService
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
import { RedisBrandService } from "./redis/brands";
import { RedisTransactionRecordService } from "./redis/transactions-record";
import { RedisDemoConfigService } from "./redis/demo-configs";
import { PostgresBrandService } from "./postgres/brands";
import { PostgresTransactionRecordService } from "./postgres/transactions";
import { PostgresWebhookEventService } from "./postgres/webhook-events";
import { PostgresDemoConfigService } from "./postgres/demo-configs";
import type {
  BrandService,
  DemoConfigService,
  Services,
  TransactionRecordService,
  WebhookEventService,
} from "./types";

// Export service instances
export const transactionService = new RedisTransactionService();
export const userService = new RedisUserService();
export const checkoutService = new RedisCheckoutService();
export const brandService: BrandService = env.USE_POSTGRES_BRANDS
  ? new PostgresBrandService()
  : new RedisBrandService();
export const transactionRecordService: TransactionRecordService =
  env.USE_POSTGRES_TRANSACTIONS
    ? new PostgresTransactionRecordService()
    : new RedisTransactionRecordService();
export const webhookEventService: WebhookEventService =
  new PostgresWebhookEventService();
export const demoConfigService: DemoConfigService = env.USE_POSTGRES_DEMO_CONFIGS
  ? new PostgresDemoConfigService()
  : new RedisDemoConfigService();

// Export as combined services object
export const services: Services = {
  transactions: transactionService,
  transactionRecords: transactionRecordService,
  webhookEvents: webhookEventService,
  users: userService,
  checkouts: checkoutService,
  brands: brandService,
  demoConfigs: demoConfigService,
};

// Re-export types
export type {
  TransactionService,
  UserService,
  CheckoutService,
  TransactionListOptions,
  UserListOptions,
  BrandService,
  BrandListOptions,
  Brand,
  BrandLogoKind,
  BrandBorderRadius,
  CreateBrandInput,
  UpdateBrandInput,
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
} from "./types";
export { DuplicateWebhookEventError } from "./types";
