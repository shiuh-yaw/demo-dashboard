import { NextResponse } from "next/server";
import { readByConfirmation } from "@/lib/store/order-store";
import { getOrderByNumber } from "@/lib/cvent/orders";
import { env } from "@/lib/env";
import { timingSafeEqualStrings } from "@/lib/auth-compare";
import { assertSafeConfirmation } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ confirmation: string }> }
) {
  // Explicit guard: an unset SPARK26_ADMIN_SECRET would collapse the
  // comparison to `Bearer undefined`, letting anyone who literally sends
  // that header unlock the route.
  if (!env.SPARK26_ADMIN_SECRET) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!timingSafeEqualStrings(auth, `Bearer ${env.SPARK26_ADMIN_SECRET}`)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { confirmation: raw } = await params;
  let confirmation: string;
  try {
    confirmation = assertSafeConfirmation(raw);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const order = await readByConfirmation(confirmation);
  const cvent = await getOrderByNumber(confirmation).catch((e) => ({
    error: e instanceof Error ? e.message : String(e),
  }));
  return NextResponse.json({ order, cvent });
}
