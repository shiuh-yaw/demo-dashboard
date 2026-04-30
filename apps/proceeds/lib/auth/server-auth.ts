import { cache } from "react";
import { cookies } from "next/headers";
import { getAuthenticatedUserFromCookies } from "@dynamic-demos/dynamic";

export interface ServerUserData {
  isLoggedIn: boolean;
  userId: string;
}

/**
 * Get user data from server (auth status).
 * Returns null when not authenticated — callers handle redirect.
 * Cached per-request so layout + page share the same fetch.
 */
export const getServerUserData = cache(
  async function getServerUserData(): Promise<ServerUserData | null> {
    const cookieStore = await cookies();
    const authUser = await getAuthenticatedUserFromCookies(cookieStore);

    if (!authUser) return null;

    const userId = authUser.sub ?? authUser.userId ?? "";
    if (!userId) return null;

    return {
      isLoggedIn: true,
      userId,
    };
  },
);
