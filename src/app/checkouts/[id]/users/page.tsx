/**
 * Checkout Users Page (Server Component)
 *
 * Lists all users for a checkout with server-side data fetching.
 */

import { userService } from "@/lib/services";
import { UsersTab } from "../../components/management/users-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckoutUsersPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch users server-side
  const result = await userService.list(id, { pageSize: 20 }).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  }));

  return (
    <UsersTab
      checkoutId={id}
      initialUsers={result.items}
      initialTotal={result.total}
    />
  );
}
