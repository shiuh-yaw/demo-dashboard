/**
 * List Users Handler
 *
 * Lists users for a checkout with pagination.
 */

import { services, userService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import {
  listUsersSchema,
  parseWithSchema,
  type ListUsersInput,
} from "@/lib/validation";
import type { PaginatedResponse, User } from "@/lib/types/dashboard";

export async function handleListUsers(
  rawInput: unknown
): Promise<PaginatedResponse<User>> {
  const { checkoutId, page, pageSize } = parseWithSchema(
    listUsersSchema,
    rawInput
  );

  // Verify checkout exists (Postgres via `services.demoConfigs`; see
  // `get-checkout.ts` for the split-brain fix context).
  const record = await services.demoConfigs.get(checkoutId);
  if (!record || record.kind !== "checkout") {
    throw new NotFoundError("Checkout not found");
  }

  return userService.list(checkoutId, { page, pageSize });
}

// Re-export types for route usage
export type { ListUsersInput };
