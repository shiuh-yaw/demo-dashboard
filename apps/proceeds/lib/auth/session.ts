"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getJwtExpirationSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      return Math.max(60, Math.min(remaining, DEFAULT_COOKIE_MAX_AGE));
    }
  } catch {
    // ignore
  }
  return DEFAULT_COOKIE_MAX_AGE;
}

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

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}
