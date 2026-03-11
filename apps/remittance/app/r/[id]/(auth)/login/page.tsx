import { redirect } from "next/navigation";
import { getServerUserData } from "@/lib/auth/server-auth";
import { LoginPage } from "@/components/login-page";

interface LoginPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<
    { returnTo?: string } & Record<string, string | string[] | undefined>
  >;
}

export default async function ConfigLoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { id } = await params;
  const search = await searchParams;
  const returnTo = search.returnTo;
  const loginPath = `/r/${id}/login`;
  const defaultReturnTo = `/r/${id}/dashboard`;

  // When returning from OAuth, let client complete the flow (don't redirect away)
  const isOAuthCallback = !!(
    search.dynamicOauthCode ||
    (search.code && search.state)
  );

  const userData = await getServerUserData({
    redirectToLogin: false,
    loginPath,
  });
  if (userData && !isOAuthCallback) {
    redirect(returnTo || defaultReturnTo);
  }

  return <LoginPage returnToOverride={returnTo ?? defaultReturnTo} />;
}
