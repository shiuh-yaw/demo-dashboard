import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const attrs = [
    `${ADMIN_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: { "Set-Cookie": attrs, "Cache-Control": "no-store" },
    },
  );
}
