import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";
import { LoginContent } from "@/components/login-content";
import { LoginCleanup } from "@/components/login-cleanup";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const loggedOut = params.loggedOut === "true";

  // Check if this is an OAuth callback (has code/state or dynamicOauthCode params)
  // If so, skip server-side auth check - let client handle OAuth completion
  const isOAuthCallback = !!(
    params.dynamicOauthCode ||
    (params.code && params.state)
  );

  // Redirect if already authenticated (middleware should handle this, but double-check)
  // Skip this check if:
  // - User just logged out (to prevent redirect blip)
  // - This is an OAuth callback (client needs to complete OAuth first)
  if (!loggedOut && !isOAuthCallback) {
    const authenticated = await isAuthenticated();
    if (authenticated) redirect("/earn");
  }

  return (
    <>
      <LoginCleanup />
      {!isOAuthCallback && (
        <div className="text-center mb-6">
          <p className="text-sm text-earn-text-secondary">
            Sign in to access your Earn dashboard
          </p>
        </div>
      )}
      <LoginContent isOAuthCallback={isOAuthCallback} />
    </>
  );
}
