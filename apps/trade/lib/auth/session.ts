"use server";

/**
 * Session Management
 *
 * Server actions for syncing Dynamic JWT to httpOnly cookie.
 * Enables middleware and server components to verify auth.
 */

import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  DYNAMIC_JWT_COOKIE_NAME,
  getJwtExpirationSeconds,
} from "./cookie-utils";

/**
 * Set Dynamic JWT token in cookie after successful authentication.
 * Called by DynamicInit on token change and for returning users.
 */
export async function setDynamicJWT(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const maxAge = getJwtExpirationSeconds(token);

    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set auth cookie",
    };
  }
}

/**
 * Clear auth cookie (logout).
 * Called by DynamicInit on logout event and by useLogout.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}
