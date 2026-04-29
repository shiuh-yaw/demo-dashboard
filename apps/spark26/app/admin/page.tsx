import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/auth/admin-session";
import { listAllOrders } from "@/lib/store/all-orders";
import AdminClient from "./AdminClient.js";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const jar = await cookies();
  const cookie = jar.get(ADMIN_COOKIE_NAME)?.value ?? "";
  if (!cookie || !verifyAdminSession(cookie).ok) {
    redirect("/admin/login");
  }
  const orders = await listAllOrders();
  return <AdminClient initialOrders={orders} />;
}
