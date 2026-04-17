import { AppShell } from "@/components/layouts/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getServerUserData();
  // getServerUserData() redirects to /login when unauthenticated
  if (!data) return null;

  return <AppShell>{children}</AppShell>;
}
