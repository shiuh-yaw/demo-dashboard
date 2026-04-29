import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/auth/admin-session";
import { listAllOrders } from "@/lib/store/all-orders";

export const dynamic = "force-dynamic";

function extractCookie(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE_NAME) return rest.join("=");
  }
  return null;
}

export async function GET(req: Request) {
  const cookie = extractCookie(req);
  if (!cookie) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const verified = verifyAdminSession(cookie);
  if (!verified.ok) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const orders = await listAllOrders();
  return NextResponse.json(
    { orders },
    { headers: { "Cache-Control": "no-store" } },
  );
}
