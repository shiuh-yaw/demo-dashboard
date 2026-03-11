import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days fallback

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

/**
 * POST /api/auth/sync-cookie
 *
 * Sets the Dynamic JWT as an httpOnly cookie.
 * Uses a plain API route (not a server action) so that calling it
 * does NOT trigger Next.js RSC re-rendering of the current page.
 * This prevents redirect races during the OAuth login flow.
 */
export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token || typeof token !== "string") {
      return Response.json(
        { success: false, error: "Missing token" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const maxAge = getJwtExpirationSeconds(token);

    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to set auth cookie",
      },
      { status: 500 },
    );
  }
}
