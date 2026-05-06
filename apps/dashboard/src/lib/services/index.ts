/**
 * Service Layer
 *
 * Exports service instances for use throughout the application.
 *
 * Most services still resolve to their Redis implementations. Brands are
 * the first record type to flip — `USE_POSTGRES_BRANDS=true` routes them
 * to `@dynamic-demos/db`. Default is Redis so production stays unchanged
 * until the explicit cutover.
 */

import { env } from "@/env";
import { RedisTransactionService } from "./redis/transactions";
import { RedisUserService } from "./redis/users";
import { RedisCheckoutService } from "./redis/checkouts";
import { RedisBrandService } from "./redis/brands";
import { PostgresBrandService } from "./postgres/brands";
import type { BrandService, Services } from "./types";

// Export service instances
export const transactionService = new RedisTransactionService();
export const userService = new RedisUserService();
export const checkoutService = new RedisCheckoutService();
export const brandService: BrandService = env.USE_POSTGRES_BRANDS
  ? new PostgresBrandService()
  : new RedisBrandService();

// Export as combined services object
export const services: Services = {
  transactions: transactionService,
  users: userService,
  checkouts: checkoutService,
  brands: brandService,
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
  CreateBrandInput,
  UpdateBrandInput,
  Services,
} from "./types";
