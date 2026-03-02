/**
 * Service Layer
 *
 * Exports service instances for use throughout the application.
 * Currently uses Redis implementations.
 *
 * To switch to Prisma, replace the implementations here.
 */

import { RedisTransactionService } from "./redis/transactions";
import { RedisUserService } from "./redis/users";
import { RedisCheckoutService } from "./redis/checkouts";
import type { Services } from "./types";

// Export service instances
export const transactionService = new RedisTransactionService();
export const userService = new RedisUserService();
export const checkoutService = new RedisCheckoutService();

// Export as combined services object
export const services: Services = {
  transactions: transactionService,
  users: userService,
  checkouts: checkoutService,
};

// Re-export types
export type {
  TransactionService,
  UserService,
  CheckoutService,
  TransactionListOptions,
  UserListOptions,
  Services,
} from "./types";
