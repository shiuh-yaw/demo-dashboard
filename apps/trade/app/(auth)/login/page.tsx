import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { LoginPage } from "@/components/login-page";

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const userData = await getServerUserData();
  if (userData) {
    const { returnTo } = await searchParams;
    redirect(returnTo || "/");
  }
  return <LoginPage />;
}
