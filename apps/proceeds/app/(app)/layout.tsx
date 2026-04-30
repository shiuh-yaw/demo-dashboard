import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/layouts/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const userData = await getServerUserData();

  if (!userData) {
    const pathname = headersList.get("x-pathname") ?? "/payment-methods";
    const returnTo = pathname.replace(/\/$/, "") || "/payment-methods";
    const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}&sessionExpired=1`;
    redirect(loginUrl);
  }

  return <AppShell>{children}</AppShell>;
}
