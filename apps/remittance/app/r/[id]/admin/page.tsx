import { UserList } from "@/components/admin/user-list";
import { listUsersWithBalances } from "@/lib/admin-users";

export default async function ConfigAdminUsersPage() {
  let users;
  let error: string | null = null;

  try {
    users = await listUsersWithBalances();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load users";
  }

  return <UserList initialUsers={users ?? []} error={error} />;
}
