import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { LoginPageClient } from "./login-page-client";

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const userData = await getServerUserData({ redirectToLogin: false });
  if (userData) {
    const { returnTo } = await searchParams;
    redirect(returnTo || "/payment-methods");
  }
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
