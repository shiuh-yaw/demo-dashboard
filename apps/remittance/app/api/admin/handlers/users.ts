/**
 * Admin Users Handlers
 */

import { listUsersWithBalances } from "@/lib/admin-users";

export { listUsersWithBalances } from "@/lib/admin-users";

export async function handleListUsers(query?: string) {
  const users = await listUsersWithBalances(query);
  return { users };
}
