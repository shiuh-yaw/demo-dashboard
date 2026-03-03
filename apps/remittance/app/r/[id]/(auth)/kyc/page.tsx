import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { KycPage } from "@/components/kyc-page";

interface KycPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function ConfigKycPage({
  params,
  searchParams,
}: KycPageProps) {
  const { id } = await params;
  const loginPath = `/r/${id}/login`;

  const userData = await getServerUserData({
    redirectToLogin: true,
    loginPath,
  });
  if (!userData) return null;

  if (userData.kycApproved) {
    const { returnTo } = await searchParams;
    const destination = returnTo?.startsWith("/")
      ? returnTo
      : `/${returnTo ?? `/r/${id}/dashboard`}`.replace(/\/+$/, "") ||
        `/r/${id}/dashboard`;
    redirect(destination);
  }

  return <KycPage />;
}
