import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { KycPage } from "@/components/kyc-page";

export default async function KycRoute({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const userData = await getServerUserData();
  // getServerUserData() redirects to /login when unauthenticated
  if (!userData) return null;
  if (userData.kycApproved) {
    const { returnTo } = await searchParams;
    const destination = returnTo?.startsWith("/")
      ? returnTo
      : `/${returnTo ?? ""}`.replace(/\/+$/, "") || "/";
    redirect(destination);
  }
  return <KycPage />;
}
