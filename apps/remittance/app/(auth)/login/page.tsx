import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { LoginPage } from "@/components/login-page";

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const userData = await getServerUserData({ redirectToLogin: false });
  if (userData) {
    const { returnTo } = await searchParams;
    const destination = returnTo?.startsWith("/")
      ? returnTo
      : `/${returnTo ?? ""}`.replace(/\/+$/, "") || "/";
    redirect(
      userData.kycApproved
        ? destination
        : `/kyc?returnTo=${encodeURIComponent(destination)}`,
    );
  }
  return <LoginPage />;
}
