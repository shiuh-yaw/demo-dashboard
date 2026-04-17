/**
 * Server-side auth for Visa Direct page render.
 * No KYC gate (kyc: "none"). Just checks auth cookie.
 */

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";

export interface ServerUserData {
  isLoggedIn: boolean;
  userId: string;
}

export interface GetServerUserDataOptions {
  /** When true (default), redirects to login when not authenticated. */
  redirectToLogin?: boolean;
}

/**
 * Get user data from server (auth status).
 * When redirectToLogin is true (default), redirects to /login when not authenticated.
 * Cached per-request so layout + page share the same fetch.
 */
export const getServerUserData = cache(async function getServerUserData(
  options?: GetServerUserDataOptions,
): Promise<ServerUserData | null> {
  const { redirectToLogin = true } = options ?? {};
  const cookieStore = await cookies();
  const authUser = await getAuthenticatedUserFromCookies(cookieStore);

  if (!authUser) {
    if (redirectToLogin) {
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") ?? "/";
      const returnTo = encodeURIComponent(
        pathname.startsWith("/") ? pathname : `/${pathname}`,
      );
      redirect(`/login?returnTo=${returnTo}&sessionExpired=1`);
    }
    return null;
  }

  const userId = authUser.sub ?? authUser.userId ?? "";
  if (!userId) {
    if (redirectToLogin) {
      redirect("/login?sessionExpired=1");
    }
    return null;
  }

  return {
    isLoggedIn: true,
    userId,
  };
});
